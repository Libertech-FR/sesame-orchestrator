import {
  filterSchema,
  FilterSchema,
  FilterSchemaOptions,
  SearchFilterInput,
} from '@tacxou/nestjs_module_restools/search-filter-schema';

export type FilterGroup = Record<string, unknown>;

/**
 * Filtre au format des clés signées : un groupe de conditions combinées par ET,
 * ou une liste de groupes combinés par OU
 */
export type FilterGroups = FilterGroup | FilterGroup[];

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Retourne la liste des groupes OU du filtre, ou null s'il s'agit d'un simple groupe ET.
 * qs transforme les tableaux de plus de 20 éléments en objets indexés (`{ "0": ..., "21": ... }`) : ils sont aussi acceptés.
 */
export function extractFilterGroups(filters: unknown): FilterGroup[] | null {
  if (Array.isArray(filters)) {
    if (filters.some((group) => !isPlainRecord(group))) {
      throw new Error('Invalid filters: expected an array of filter groups');
    }
    return filters;
  }

  if (isPlainRecord(filters)) {
    const keys = Object.keys(filters);
    if (keys.length > 0 && keys.every((key) => /^\d+$/.test(key) && isPlainRecord(filters[key]))) {
      return keys.sort((a, b) => Number(a) - Number(b)).map((key) => filters[key] as FilterGroup);
    }
  }

  return null;
}

/**
 * Préfixe de négation d'une condition : `!<signe><champ>` (ex: `!^mail` = ne contient pas)
 */
export const FILTER_NEGATION_PREFIX = '!';

/**
 * Inverse une condition Mongo d'un champ : `$not` pour une expression d'opérateurs, `$ne` pour une égalité
 */
function negateCondition(condition: unknown): unknown {
  const isOperatorExpression = isPlainRecord(condition) && Object.keys(condition).some((key) => key.startsWith('$'));
  return isOperatorExpression ? { $not: condition } : { $ne: condition };
}

/**
 * Convertit un groupe de conditions combinées par ET, en gérant la négation `!` de chaque condition.
 * restools ne sait nier que `:`, `#` et `@` : la négation est donc appliquée ici, sur le résultat de la condition positive.
 */
function filterGroupSchema(group: FilterGroup, options?: FilterSchemaOptions): FilterSchema {
  const positive: FilterGroup = {};
  const negated: Record<string, unknown>[] = [];

  for (const [key, value] of Object.entries(group)) {
    if (!key.startsWith(FILTER_NEGATION_PREFIX)) {
      positive[key] = value;
      continue;
    }

    const condition = filterSchema({ [key.slice(1)]: value } as SearchFilterInput, options);
    for (const [field, fieldCondition] of Object.entries(condition)) {
      negated.push({ [field]: negateCondition(fieldCondition) });
    }
  }

  const result: Record<string, unknown> = { ...filterSchema(positive as SearchFilterInput, options) };
  const conflicts: Record<string, unknown>[] = [];
  for (const condition of negated) {
    const [field, fieldCondition] = Object.entries(condition)[0];
    if (field in result) conflicts.push(condition);
    else result[field] = fieldCondition;
  }
  if (conflicts.length) result.$and = conflicts;

  return result as FilterSchema;
}

/**
 * Extension de `filterSchema` (restools) supportant des groupes de conditions reliés par un OU
 * et la négation de chaque condition.
 *
 * Format accepté :
 * - `{ "<signe><champ>": valeur, ... }` : conditions combinées par ET (format historique)
 * - `[ { ...conditions ET... }, { ... } ]` : (groupe 1) OU (groupe 2) ...
 *   (en query : `filters[0][:sn]=x&filters[1][^mail]=/foo/i`)
 * - `{ "!<signe><champ>": valeur }` : négation de la condition (ex: `!^mail` = ne contient pas)
 *
 * Le OU est encapsulé dans un `$and` afin de ne pas entrer en conflit avec le `$or`
 * de la recherche textuelle que les controllers fusionnent au même niveau.
 */
export function filterSchemaWithGroups(
  filters: SearchFilterInput | FilterGroups,
  options?: FilterSchemaOptions,
): FilterSchema {
  const groups = extractFilterGroups(filters);
  if (!groups) {
    return isPlainRecord(filters)
      ? filterGroupSchema(filters, options)
      : filterSchema(filters as SearchFilterInput, options);
  }

  const conditions = groups
    .map((group) => filterGroupSchema(group, options))
    .filter((condition) => Object.keys(condition).length > 0);

  if (conditions.length === 0) return {};
  if (conditions.length === 1) return conditions[0];

  return { $and: [{ $or: conditions }] } as unknown as FilterSchema;
}

/**
 * Indique si un filtre Mongo issu de `filterSchemaWithGroups` porte une condition sur la clé donnée,
 * à la racine ou dans un groupe `$and` / `$or`
 */
export function filterSchemaHasKey(schema: unknown, key: string): boolean {
  if (!isPlainRecord(schema)) return false;
  if (Object.prototype.hasOwnProperty.call(schema, key)) return true;

  return ['$and', '$or'].some(
    (operator) =>
      Array.isArray(schema[operator]) && schema[operator].some((sub: unknown) => filterSchemaHasKey(sub, key)),
  );
}

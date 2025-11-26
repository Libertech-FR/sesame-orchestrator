import { objectify, isObject, isArray, get } from 'radash'
import { ClassTransformOptions, instanceToPlain } from 'class-transformer'

/**
 * Extrait récursivement tous les chemins de propriétés d'un objet sous forme de notation à points.
 *
 * Parcourt un objet ou tableau de manière récursive pour générer la liste complète
 * des chemins d'accès aux propriétés en notation pointée (ex: "user.address.city").
 *
 * @template TValue Type de l'objet à analyser
 * @param {TValue} value - Objet dont extraire les chemins de propriétés
 * @returns {string[]} Tableau des chemins en notation pointée
 *
 * @description
 * Comportement selon le type de données :
 * - Objet : Parcourt récursivement toutes les propriétés
 * - Tableau de primitives : Retourne les chemins sans indices
 * - Tableau d'objets : Inclut les indices numériques dans les chemins
 * - Valeur primitive : Retourne le chemin complet
 * - Valeur nulle/undefined : Retourne un tableau vide
 *
 * @example
 * ```typescript
 * const data = {
 *   user: {
 *     name: 'John',
 *     address: {
 *       city: 'Paris',
 *       zip: '75001'
 *     }
 *   },
 *   tags: ['admin', 'user']
 * };
 *
 * const paths = keys(data);
 * // Retourne: [
 * //   'user.name',
 * //   'user.address.city',
 * //   'user.address.zip',
 * //   'tags'
 * // ]
 *
 * const arrayData = {
 *   items: [
 *     { id: 1, name: 'Item 1' },
 *     { id: 2, name: 'Item 2' }
 *   ]
 * };
 *
 * const arrayPaths = keys(arrayData);
 * // Retourne: [
 * //   'items.0.id',
 * //   'items.0.name',
 * //   'items.1.id',
 * //   'items.1.name'
 * // ]
 * ```
 */
export const keys = <TValue extends object>(value: TValue): string[] => {
  if (!value) return []

  const getKeys = (nested: any, paths: string[]): string[] => {
    if (isObject(nested)) {
      return Object.entries(nested).flatMap(([k, v]) => getKeys(v, [...paths, k]))
    }

    if (isArray(nested)) {
      if (nested.length > 0 && ['string', 'number', 'boolean'].includes(typeof nested[0])) {
        return nested.flatMap((item) => getKeys(item, paths))
      }

      return nested.flatMap((item, i) => getKeys(item, [...paths, `${i}`]))
    }

    return [paths.join('.')]
  }

  return getKeys(value, [])
}

/**
 * Convertit un objet ou une instance de classe en objet plat avec notation pointée.
 *
 * Cette fonction transforme d'abord l'objet en plain object (via class-transformer),
 * puis "écrase" la structure imbriquée en un objet plat où les clés utilisent
 * la notation à points pour représenter les chemins d'accès.
 *
 * @template TValue Type de l'objet à transformer
 * @param {TValue} value - Objet ou instance de classe à aplatir
 * @param {ClassTransformOptions} [options] - Options de transformation class-transformer
 * @returns {object} Objet plat avec clés en notation pointée
 *
 * @description
 * Processus de transformation :
 * 1. Conversion de l'instance en plain object (supprime les méthodes, applique @Expose/@Exclude)
 * 2. Extraction de tous les chemins de propriétés
 * 3. Création d'un nouvel objet avec clés en notation pointée
 *
 * Cas d'usage typiques :
 * - Préparation de données pour des systèmes de recherche
 * - Export de données en format CSV/Excel
 * - Indexation dans des bases de données NoSQL
 * - Comparaison de structures complexes
 *
 * @example
 * ```typescript
 * class User {
 *   name: string;
 *   address: {
 *     city: string;
 *     zip: string;
 *   };
 * }
 *
 * const user = new User();
 * user.name = 'John Doe';
 * user.address = { city: 'Paris', zip: '75001' };
 *
 * const flat = toPlainAndCrush(user);
 * // Retourne: {
 * //   'name': 'John Doe',
 * //   'address.city': 'Paris',
 * //   'address.zip': '75001'
 * // }
 *
 * // Avec options class-transformer
 * const flatExcluded = toPlainAndCrush(user, {
 *   excludeExtraneousValues: true
 * });
 *
 * // Utilisation pour la recherche
 * const searchIndex = toPlainAndCrush(complexObject);
 * Object.entries(searchIndex).forEach(([key, value]) => {
 *   indexer.add(key, value);
 * });
 * ```
 */
export const toPlainAndCrush = <TValue extends object>(value: TValue, options?: ClassTransformOptions): object => {
  return objectify(
    keys(instanceToPlain(value, options)),
    (k) => k,
    (k) => get(value, k),
  )
}

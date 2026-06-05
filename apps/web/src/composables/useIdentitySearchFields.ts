import type { QTableProps } from 'quasar'

/** Champs de recherche par défaut côté API — garder aligné avec identities-search-fields.helper.ts */
export const DEFAULT_IDENTITY_SEARCH_FIELD_PATHS = [
  'inetOrgPerson.cn',
  'inetOrgPerson.givenName',
  'inetOrgPerson.sn',
  'inetOrgPerson.mail',
  'inetOrgPerson.employeeType',
  'inetOrgPerson.employeeNumber',
] as const

const DEFAULT_IDENTITY_SEARCH_FIELDS = new Set<string>(DEFAULT_IDENTITY_SEARCH_FIELD_PATHS)

export type IdentitySearchFieldHint = {
  path: string
  label: string
}

export type IdentitySearchFieldsHint = {
  defaultFields: IdentitySearchFieldHint[]
  extraFields: IdentitySearchFieldHint[]
}

/** Libellés dédiés à l’infobulle de recherche (prioritaires sur identities-columns.yml). */
const SEARCH_FIELD_LABEL_OVERRIDES: Record<string, string> = {
  'inetOrgPerson.cn': 'Nom + prénom (combiné)',
  'inetOrgPerson.givenName': 'Prénom',
  'inetOrgPerson.sn': 'Nom de famille',
  'inetOrgPerson.mail': 'Email',
  'inetOrgPerson.employeeType': 'Type employé',
  'inetOrgPerson.employeeNumber': 'Matricule',
}

export function resolveIdentitySearchFieldLabel(
  path: string,
  columns?: QTableProps['columns'],
): string {
  if (SEARCH_FIELD_LABEL_OVERRIDES[path]) return SEARCH_FIELD_LABEL_OVERRIDES[path]
  const column = columns?.find((col) => col?.name === path)
  if (column?.label) return `${column.label}`
  return path
}

function toSearchFieldHints(paths: string[], columns?: QTableProps['columns']): IdentitySearchFieldHint[] {
  return paths.map((path) => ({
    path,
    label: resolveIdentitySearchFieldLabel(path, columns),
  }))
}

function dedupeExtraSearchFields(fields: unknown): string[] {
  if (!Array.isArray(fields)) return []

  const unique = new Set<string>()
  for (const field of fields) {
    if (typeof field !== 'string') continue
    const trimmed = field.trim()
    if (!trimmed || DEFAULT_IDENTITY_SEARCH_FIELDS.has(trimmed)) continue
    unique.add(trimmed)
  }

  return Array.from(unique)
}

export function useIdentitySearchFields() {
  const config = useAppConfig()
  const configuredFields = (config as { identitiesSearchFields?: { fields?: unknown } })?.identitiesSearchFields?.fields

  const extraSearchFields = computed(() => dedupeExtraSearchFields(configuredFields))

  const getSearchFieldsQuery = (): Record<string, string[]> => {
    const fields = extraSearchFields.value
    if (fields.length === 0) return {}
    return { searchFields: fields }
  }

  const buildSearchFieldsHint = (columns?: QTableProps['columns']): IdentitySearchFieldsHint => ({
    defaultFields: toSearchFieldHints([...DEFAULT_IDENTITY_SEARCH_FIELD_PATHS], columns),
    extraFields: toSearchFieldHints(extraSearchFields.value, columns),
  })

  return {
    extraSearchFields,
    getSearchFieldsQuery,
    buildSearchFieldsHint,
  }
}

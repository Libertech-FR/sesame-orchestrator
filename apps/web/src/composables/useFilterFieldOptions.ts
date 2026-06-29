import type { QTableProps } from 'quasar'
import { resolveIdentitySearchFieldLabel } from './useIdentitySearchFields'

export type FilterFieldOption = {
  name: string
  label: string
  isCustom?: boolean
}

const CUSTOM_FILTER_FIELDS_STORAGE_PREFIX = 'sesame:custom-filter-fields:'

/** Champs proposés par défaut dans « Champ à filtrer » (identités). */
export const DEFAULT_IDENTITY_FILTER_FIELD_PATHS = [
  'state',
  'lifecycle',
  'dataStatus',
  'initState',
  'inetOrgPerson.uid',
  'inetOrgPerson.cn',
  'inetOrgPerson.givenName',
  'inetOrgPerson.sn',
  'inetOrgPerson.mail',
  'inetOrgPerson.employeeType',
  'inetOrgPerson.employeeNumber',
  'inetOrgPerson.departmentNumber',
  'additionalFields.attributes.supannPerson.supannTypeEntiteAffectation',
  'additionalFields.attributes.supannPerson.edupersonprincipalname',
  'metadata.lastUpdatedAt',
  'metadata.createdAt',
  'lastSync',
] as const

const FILTER_FIELD_LABEL_OVERRIDES: Record<string, string> = {
  state: 'État',
  lifecycle: 'Cycle de vie',
  dataStatus: 'Statut des données',
  initState: "État d'initialisation",
  lastSync: 'Dernière synchronisation',
  'inetOrgPerson.departmentNumber': 'Numéro de département',
  'inetOrgPerson.employeeType': 'Type de source',
  'metadata.lastUpdatedAt': 'Date de modification',
  'metadata.createdAt': 'Date de création',
  'additionalFields.attributes.supannPerson.supannTypeEntiteAffectation': 'Affectation',
  'additionalFields.attributes.supannPerson.edupersonprincipalname': 'Identifiant éducation (edupersonprincipalname)',
}

function resolveFilterFieldLabel(path: string, columns?: QTableProps['columns']): string {
  if (FILTER_FIELD_LABEL_OVERRIDES[path]) return FILTER_FIELD_LABEL_OVERRIDES[path]
  return resolveIdentitySearchFieldLabel(path, columns)
}

function pathToOption(path: string, columns?: QTableProps['columns'], isCustom = false): FilterFieldOption {
  if (isCustom) {
    return { name: path, label: path, isCustom: true }
  }

  return { name: path, label: resolveFilterFieldLabel(path, columns), isCustom: false }
}

function dedupeOptions(options: FilterFieldOption[]): FilterFieldOption[] {
  const seen = new Set<string>()
  const result: FilterFieldOption[] = []

  for (const option of options) {
    if (seen.has(option.name)) continue
    seen.add(option.name)
    result.push(option)
  }

  return result
}

export function loadCustomFilterFields(storageKey: string): string[] {
  if (!import.meta.client || !storageKey) return []

  try {
    const raw = localStorage.getItem(`${CUSTOM_FILTER_FIELDS_STORAGE_PREFIX}${storageKey}`)
    if (!raw) return []

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return parsed.filter((field): field is string => typeof field === 'string' && field.trim().length > 0)
  } catch {
    return []
  }
}

export function saveCustomFilterField(storageKey: string, field: string): void {
  if (!import.meta.client || !storageKey) return

  const trimmed = field.trim()
  if (!trimmed) return

  const existing = loadCustomFilterFields(storageKey)
  if (existing.includes(trimmed)) return

  localStorage.setItem(`${CUSTOM_FILTER_FIELDS_STORAGE_PREFIX}${storageKey}`, JSON.stringify([...existing, trimmed]))
}

export function removeCustomFilterField(storageKey: string, field: string): void {
  if (!import.meta.client || !storageKey) return

  const trimmed = field.trim()
  if (!trimmed) return

  const existing = loadCustomFilterFields(storageKey)
  const next = existing.filter((item) => item !== trimmed)
  if (next.length === existing.length) return

  const storageItemKey = `${CUSTOM_FILTER_FIELDS_STORAGE_PREFIX}${storageKey}`
  if (next.length === 0) {
    localStorage.removeItem(storageItemKey)
  } else {
    localStorage.setItem(storageItemKey, JSON.stringify(next))
  }
}

export function buildFilterFieldOptions(
  columns: QTableProps['columns'],
  options?: {
    extraDefaultPaths?: readonly string[]
    customStorageKey?: string
  },
): FilterFieldOption[] {
  const columnOptions = (columns || [])
    .filter((column) => column?.name)
    .map((column) => ({
      name: column.name!,
      label: column.label || column.name!,
      isCustom: false,
    }))

  const extraOptions = (options?.extraDefaultPaths || []).map((path) => pathToOption(path, columns))
  const customOptions = (options?.customStorageKey ? loadCustomFilterFields(options.customStorageKey) : []).map((path) =>
    pathToOption(path, columns, true),
  )

  return dedupeOptions([...columnOptions, ...extraOptions, ...customOptions])
}

function normalizeFilterFieldName(field: string): string {
  return `${field || ''}`.replace(/\[\]$/, '')
}

export function isRecognizedFilterField(
  field: string,
  context: {
    columns?: QTableProps['columns']
    columnsType?: { name: string }[]
    defaultFilterFieldPaths?: readonly string[]
  },
): boolean {
  const normalized = normalizeFilterFieldName(field)
  if (!normalized) return false

  if (context.columns?.some((column) => column?.name === normalized)) {
    return true
  }

  if (context.columnsType?.some((column) => column.name === normalized)) {
    return true
  }

  if (context.defaultFilterFieldPaths?.includes(normalized)) {
    return true
  }

  return false
}

const DEFAULT_FILTER_FIELD_TYPES: Record<string, string> = {
  state: 'number',
  dataStatus: 'number',
  initState: 'number',
  'metadata.lastUpdatedAt': 'date',
  'metadata.createdAt': 'date',
  lastSync: 'date',
}

export function resolveFilterFieldType(field: string, columnsType?: { name: string; type: string }[]): string {
  const normalized = normalizeFilterFieldName(field)
  return columnsType?.find((column) => column.name === normalized)?.type || DEFAULT_FILTER_FIELD_TYPES[normalized] || 'text'
}

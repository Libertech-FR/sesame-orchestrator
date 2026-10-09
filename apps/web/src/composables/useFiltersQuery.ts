import type { QTableProps } from "quasar"
import type { LocationQueryValue } from "vue-router"
import dayjs from "dayjs"

const fieldTypes = ref<
  {
    label: string
    value: string
  }[]
>([
  { label: 'Texte', value: 'text' },
  { label: 'Nombre', value: 'number' },
  { label: 'Date', value: 'date' },
])

export const FILTER_BRACES = ['[', ']']
export const FILTER_PREFIX = 'filters['
export const FILTER_SUFFIX = ']'

export type ComparatorType = {
  label: string
  querySign: string
  value: string
  icon: string
  type: string[]
  multiplefields: boolean
  prefix: string
  suffix: string
}

export type ColumnType = {
  name: string
  type: string

  valueMapping?: Record<string | number | symbol, string>
}

const comparatorTypes = ref<ComparatorType[]>([
  {
    label: "Est vide/non défini",
    querySign: '~',
    value: '~',
    icon: 'mdi-tilde',
    type: ['text', 'number', 'date', 'array'],
    multiplefields: false,
    prefix: '',
    suffix: '',
  },
  {
    label: 'Est un booléen',
    querySign: '?',
    value: '?',
    icon: 'mdi-help',
    type: ['boolean'],
    multiplefields: false,
    prefix: '',
    suffix: '',
  },
  {
    label: 'Égal à',
    querySign: ':',
    value: ':',
    icon: 'mdi-equal',
    type: ['text'],
    multiplefields: false,
    prefix: '',
    suffix: '',
  },
  {
    label: 'Entier à',
    querySign: '#',
    value: '#',
    icon: 'mdi-pound',
    type: ['number'],
    multiplefields: false,
    prefix: '',
    suffix: '',
  },
  {
    label: 'Différent',
    querySign: '!:',
    value: '!:',
    icon: 'mdi-exclamation',
    type: ['number'],
    multiplefields: false,
    prefix: '',
    suffix: '',
  },
  {
    label: 'Supérieur à',
    querySign: '>',
    value: '>',
    icon: 'mdi-greater-than',
    type: ['number', 'date'],
    multiplefields: false,
    prefix: '',
    suffix: '',
  },
  {
    label: 'Supérieur ou égal à',
    querySign: '>|#',
    value: '>|#',
    icon: 'mdi-greater-than-or-equal',
    type: ['number'],
    multiplefields: false,
    prefix: '',
    suffix: '',
  },
  {
    label: 'Supérieur ou égal à',
    querySign: '>|',
    value: '>|',
    icon: 'mdi-greater-than-or-equal',
    type: ['date'],
    multiplefields: false,
    prefix: '',
    suffix: '',
  },
  {
    label: 'Inférieur à',
    querySign: '<',
    value: '<',
    icon: 'mdi-less-than',
    type: ['number', 'date'],
    multiplefields: false,
    prefix: '',
    suffix: '',
  },
  {
    label: 'Inférieur ou égal à',
    querySign: '<|#',
    value: '<|#',
    icon: 'mdi-less-than-or-equal',
    type: ['number'],
    multiplefields: false,
    prefix: '',
    suffix: '',
  },
  {
    label: 'Inférieur ou égal à',
    querySign: '<|',
    value: '<|',
    icon: 'mdi-less-than-or-equal',
    type: ['date'],
    multiplefields: false,
    prefix: '',
    suffix: '',
  },
  // {
  //   label: 'entre',
  //   querySign: '<<',
  //   value: 'between',
  //   icon: 'mdi-arrow-expand-horizontal',
  //   type: ['number', 'date'],
  //   multiplefields: true,
  //   prefix: '',
  //   suffix: '',
  // },
  {
    label: 'Contient',
    querySign: '^',
    value: '^',
    icon: 'mdi-apple-keyboard-control',
    type: ['text'],
    multiplefields: false,
    prefix: '/',
    suffix: '/i',
  },
  {
    label: 'Commence par',
    querySign: '^',
    value: '/^',
    icon: 'mdi-contain-start',
    type: ['text'],
    multiplefields: false,
    prefix: '/^',
    suffix: '/i',
  },
  {
    label: 'Fini par',
    querySign: '^',
    value: '$/',
    icon: 'mdi-contain-end',
    type: ['text'],
    multiplefields: false,
    prefix: '/',
    suffix: '$/i',
  },
  {
    label: 'Inclus',
    querySign: '@',
    value: '@',
    icon: 'mdi-format-letter-matches',
    type: ['array', 'number', 'text'],
    multiplefields: true,
    prefix: '',
    suffix: '',
  },
])

const getAllPrefixAndSuffixPattern = computed(() => {
  const allPrefix = comparatorTypes.value.map((comparator) => comparator.prefix) ?? []
  const allSuffix = comparatorTypes.value.map((comparator) => comparator.suffix) ?? []

  return [...new Set([...allPrefix, ...allSuffix])]
})

/**
 * Get label by column name
 *
 * @param columns ref<QTableProps['columns'] & { type: string }[]>
 * @param name string
 * @returns string
 */
const getLabelByName = (columns: Ref<QTableProps['columns'] & { type: string }[]>, name: string): string => {
  const field = columns.value?.find((field) => field.name === name)

  if (!field) return name.replace(FILTER_BRACES.join(''), '')

  if (typeof (field as any).type === 'undefined' || (field as any).type !== 'multiple') {
    return (field.label as string).replace(FILTER_BRACES.join(''), '')
  }

  return field.name.replace(FILTER_BRACES.join(''), '')
}

/**
 * Extract comparator and field from the key
 *
 * @example
 * Input: ":age"
 * Output: { comparator: ":", field: "age" }
 *
 * @param key string
 * @returns comparator and field extracted from the key
 */
const extractComparator = (key: string): { comparator: string, field: string } | null => {
  const match = key.match(/^(\:|\?|\||\#|\!|\>|\<|\^|\@|\~)+/m)

  if (!match) return null

  // console.log('Extracted comparator', match, 'from key', key)
  const comparator = match[0]
  const field = key.replace(comparator, '')

  return {
    comparator,
    field,
  }
}

/**
 * Sanitize search string by removing all prefixes and suffixes
 *
 * @example
 * Input: "/^example$/i"
 * Output: "example"
 *
 * @param search string
 * @returns sanitized string
 */
const sanitizeSearchString = (search: string) => {
  const allPrefixAndSuffixPattern = getAllPrefixAndSuffixPattern.value

  for (const pattern of allPrefixAndSuffixPattern) {
    search = search.replace(pattern, '')
  }

  return search
}

const getSearchString = (
  search: LocationQueryValue | LocationQueryValue[],
  fieldLabel: string,
  columnTypes?: Ref<ColumnType[]>,
  _columns?: Ref<QTableProps['columns'] & { type: string }[]>,
) => {
  // const field = columns.value?.find((f) => f.name === fieldLabel.replace('[]', ''))
  // if (!field) return ''
  const fieldType = columnTypes?.value.find((col) => col.name === fieldLabel.replace('[]', ''))?.type || 'text'
  const columnType = columnTypes?.value.find((col) => col.name === fieldLabel.replace('[]', ''))
  // if (field.type === 'multiple') {
  //   const searchArray = Array.isArray(search) ? search : [search]
  //   return searchArray
  //     .map((search) => {
  //       const option = field.label.find((option) => option.value.toString() === search.toString())
  //       if (!option) return search
  //       return option.label
  //     })
  //     .join(' ou ')
  // }
  // if (Array.isArray(search)) {
  //   return search.join(' ou ')
  // }

  if (fieldType === 'date') {
    return dayjs(search!.toString()).format('DD/MM/YYYY HH:mm')
  }

  if (['number', 'array', 'text'].includes(fieldType) && columnType?.valueMapping) {
    if (Array.isArray(search)) {
      return search
        .map((s) => {
          if (columnType.valueMapping) {
            return columnType.valueMapping[s!.toString()] || sanitizeSearchString(s!.toString())
          }
          return sanitizeSearchString(s!.toString())
        })
        .join(', ')
    }
    return columnType.valueMapping[search!.toString()] || sanitizeSearchString(search!.toString())
  }

  console.log('No value mapping for field', fieldLabel, 'with search', search)

  return sanitizeSearchString(search!.toString())
}

const getComparatorLabel = (comparator: string) => {
  const comparatorObj = comparatorTypes.value.find((comparatorObj) => comparatorObj.querySign === comparator)

  if (!comparatorObj) return comparator

  return comparatorObj.label.toLowerCase()
}

const getComparatorObject = (comparatorSign: string, search?: string) => {
  const candidates = comparatorTypes.value.filter((c) => c.querySign === comparatorSign)

  if (!candidates || candidates.length === 0) return undefined

  if (!search) return candidates[0]

  // Prefer the candidate with the strongest match (longest matching prefix+suffix)
  let best: ComparatorType | undefined = undefined
  let bestScore = 0

  for (const cand of candidates) {
    const hasPrefix = cand.prefix !== '' && search.startsWith(cand.prefix)
    const hasSuffix = cand.suffix !== '' && search.endsWith(cand.suffix)

    const score = (hasPrefix ? cand.prefix.length : 0) + (hasSuffix ? cand.suffix.length : 0)

    if (score > bestScore) {
      bestScore = score
      best = cand
    }
  }

  if (best) return best

  return candidates[0]
}

export type FiltersRecord = Record<string, LocationQueryValue | LocationQueryValue[] | undefined>

/**
 * Groupe de conditions combinées par ET, indexées par clé signée (`<signe><champ>`, ex: `@state`)
 */
export type FilterGroup = Record<string, LocationQueryValue | LocationQueryValue[]>

/**
 * Filtre au format de l'API : un groupe ET, ou une liste de groupes combinés par OU
 */
export type FilterGroupsPayload = FilterGroup | FilterGroup[]

export type ParsedFilter = {
  key: string
  label: string
  field: string
  comparator: string
  value: unknown
  querySign: string
  search: string
  negated: boolean
}

export type WritableFilter = { key: string; operator: string; value: any; min?: string; max?: string; items?: (string | number)[]; negated?: boolean }

// `filters[0][:sn]` (groupe OU n°0) et `filters[:sn]` (groupe unique)
const FILTER_GROUP_KEY_PATTERN = /^filters\[(\d+)\]\[(.+)\]$/
const FILTER_KEY_PATTERN = /^filters\[(.+)\]$/

const isFilterKey = (key: string) => key.startsWith(FILTER_PREFIX)

const nonEmptyGroups = (groups: FilterGroup[]) => groups.filter((group) => Object.keys(group).length > 0)

/**
 * Préfixe de négation d'une condition : `!<signe><champ>` (ex: `!^mail` = ne contient pas)
 */
export const FILTER_NEGATION_PREFIX = '!'

/**
 * Sépare la négation éventuelle d'une clé signée (`!^mail` -> { negated: true, key: '^mail' })
 */
const splitNegation = (key: string): { negated: boolean; key: string } => {
  if (key.startsWith(FILTER_NEGATION_PREFIX) && extractComparator(key.slice(1))) {
    return { negated: true, key: key.slice(1) }
  }
  return { negated: false, key }
}

const getFilterField = (key: string) => extractComparator(splitNegation(key).key)?.field.replace('[]', '')

/**
 * Extrait les groupes de filtres d'un objet de query de route.
 * Un groupe unique est écrit `filters[<signe><champ>]`, plusieurs groupes OU `filters[<n>][<signe><champ>]`.
 */
export const queryToFilterGroups = (query: FiltersRecord): FilterGroup[] => {
  const single: FilterGroup = {}
  const indexed: Record<number, FilterGroup> = {}

  for (const [rawKey, rawValue] of Object.entries(query)) {
    if (!isFilterKey(rawKey) || rawValue === undefined || rawValue === null) continue
    const isList = rawKey.endsWith('[]')
    const key = isList ? rawKey.slice(0, -2) : rawKey
    const value = isList && !Array.isArray(rawValue) ? [rawValue] : rawValue

    const grouped = key.match(FILTER_GROUP_KEY_PATTERN)
    if (grouped) {
      const index = Number(grouped[1])
      indexed[index] = { ...indexed[index], [grouped[2]]: value }
      continue
    }

    const flat = key.match(FILTER_KEY_PATTERN)
    if (flat) single[flat[1]] = value
  }

  const ordered = Object.keys(indexed)
    .map(Number)
    .sort((a, b) => a - b)
    .map((index) => indexed[index])

  return nonEmptyGroups([single, ...ordered])
}

/**
 * Retourne une copie de la query où les filtres sont remplacés par les groupes donnés
 */
export const filterGroupsToQuery = <T extends FiltersRecord>(query: T, groups: FilterGroup[]): T => {
  const result: FiltersRecord = {}
  for (const [key, value] of Object.entries(query)) {
    if (!isFilterKey(key)) result[key] = value
  }

  const filled = nonEmptyGroups(groups)
  filled.forEach((group, index) => {
    for (const [key, value] of Object.entries(group)) {
      const queryKey = filled.length === 1 ? `${FILTER_PREFIX}${key}${FILTER_SUFFIX}` : `${FILTER_PREFIX}${index}][${key}${FILTER_SUFFIX}`
      // `[]` : une liste à un seul élément doit rester une liste côté API
      result[Array.isArray(value) ? `${queryKey}[]` : queryKey] = value
    }
  })

  return result as T
}

export const payloadToFilterGroups = (payload?: FilterGroupsPayload | null): FilterGroup[] => {
  if (!payload) return []
  return nonEmptyGroups(Array.isArray(payload) ? payload : [payload])
}

/**
 * Un groupe unique est renvoyé sous sa forme objet (format historique), plusieurs groupes sous forme de liste (OU)
 */
export const filterGroupsToPayload = (groups: FilterGroup[]): FilterGroupsPayload => {
  const filled = nonEmptyGroups(groups)
  if (filled.length === 0) return {}
  return filled.length === 1 ? filled[0] : filled
}

export const countFilterConditions = (groups: FilterGroup[]) => groups.reduce((total, group) => total + Object.keys(group).length, 0)

/**
 * Décrit les conditions d'un groupe pour l'affichage
 */
export const parseFilterGroup = (
  group: FilterGroup,
  columns: Ref<QTableProps['columns'] & { type: string }[]>,
  columnTypes?: Ref<ColumnType[]>,
): ParsedFilter[] => {
  const filters: ParsedFilter[] = []

  for (const [key, value] of Object.entries(group)) {
    const { negated, key: positiveKey } = splitNegation(key)
    const extract = extractComparator(positiveKey)

    if (!extract) {
      console.warn(`No comparator found for filter key: ${key}`)
      continue
    }

    const label = getLabelByName(columns, extract.field) || extract.field
    const rawValue = `${value}`
    const search = getSearchString(value, extract.field, columnTypes, columns)
    const comparatorObj = getComparatorObject(extract.comparator, rawValue)

    filters.push({
      key,
      label,
      search,
      field: extract.field,
      value: rawValue,
      querySign: extract.comparator,
      comparator: comparatorObj ? comparatorObj.label.toLowerCase() : getComparatorLabel(extract.comparator),
      negated,
    })
  }

  return filters
}

/**
 * Retourne une copie du groupe sans la condition donnée
 */
export const deleteFilterFromGroup = (group: FilterGroup, filter: { field: string; querySign: string; negated?: boolean }): FilterGroup => {
  const filterKey = `${filter.negated ? FILTER_NEGATION_PREFIX : ''}${filter.querySign}${filter.field}`

  return Object.fromEntries(Object.entries(group).filter(([key]) => key !== filterKey))
}

/**
 * Retourne une copie du groupe avec la condition donnée (remplace une éventuelle condition existante sur le même champ),
 * ou undefined si l'opérateur est inconnu
 */
export const applyFilterToGroup = (group: FilterGroup, filter: WritableFilter): FilterGroup | undefined => {
  const result: FilterGroup = {}
  const comparator = comparatorTypes.value.find((comp) => comp.value === filter.operator)
  if (!comparator) return

  const filterKey = `${filter.negated ? FILTER_NEGATION_PREFIX : ''}${comparator.querySign}${filter.key}`
  const scalarValue = typeof filter.value === 'undefined' || filter.value === null ? '' : String(filter.value).trim()

  // Remove any existing filter for the same field (en conservant l'ordre des autres conditions)
  for (const [key, value] of Object.entries(group)) {
    if (getFilterField(key) !== filter.key) result[key] = value
  }

  switch (filter.operator) {
    case '@':
      if (filter.items && filter.items.length > 0) {
        result[filterKey] = filter.items.map((item) => `${comparator.prefix || ''}${item}${comparator.suffix || ''}`)
      } else if (scalarValue) {
        result[filterKey] = scalarValue
          .split(',')
          .map((item) => item.trim())
          .filter((item) => item.length > 0)
          .map((item) => `${comparator.prefix || ''}${item}${comparator.suffix || ''}`)
      }
      break

    case '~':
      if (scalarValue) {
        result[filterKey] = scalarValue
      }
      break

    default:
      if (comparator.type.includes('date') && scalarValue) {
        const dateValue = dayjs(scalarValue as string).toISOString()
        result[filterKey] = `${comparator.prefix || ''}${dateValue}${comparator.suffix || ''}`
      } else if (scalarValue) {
        result[filterKey] = `${comparator.prefix || ''}${scalarValue}${comparator.suffix || ''}`
      }
      break
  }

  return result
}

/**
 * Écrit la condition dans le groupe d'index donné (par défaut le dernier, un nouveau groupe s'il n'y en a pas)
 */
export const writeFilterInGroups = (groups: FilterGroup[], filter: WritableFilter, index = groups.length - 1): FilterGroup[] | undefined => {
  const target = Math.min(Math.max(index, 0), groups.length)
  const group = applyFilterToGroup(groups[target] || {}, filter)
  if (!group) return

  const result = [...groups]
  result[target] = group
  return result
}

/**
 * Bascule le connecteur situé après la condition `position` du groupe `index` :
 * - ET -> OU : le groupe est coupé en deux après cette condition
 * - OU (dernière condition du groupe) -> ET : le groupe est fusionné avec le suivant
 *
 * Retourne undefined si la fusion est impossible (deux conditions sur le même champ dans un groupe ET)
 */
export const toggleFilterConnector = (groups: FilterGroup[], index: number, position: number): FilterGroup[] | undefined => {
  const entries = Object.entries(groups[index] || {})
  const result = [...groups]

  if (position < entries.length - 1) {
    result.splice(index, 1, Object.fromEntries(entries.slice(0, position + 1)), Object.fromEntries(entries.slice(position + 1)))
    return result
  }

  const next = groups[index + 1]
  if (!next) return

  const fields = new Set(entries.map(([key]) => getFilterField(key)))
  if (Object.keys(next).some((key) => fields.has(getFilterField(key)))) return

  result.splice(index, 2, { ...groups[index], ...next })
  return result
}

export function useFiltersQuery(columns: Ref<QTableProps['columns'] & { type: string }[]>, columnTypes?: Ref<ColumnType[]>) {
  const $route = useRoute()

  const filterGroups = computed(() => queryToFilterGroups($route.query))

  const countFilters = computed(() => countFilterConditions(filterGroups.value))

  const hasFilters = computed(() => countFilters.value > 0)

  const getFilters = computed(() => filterGroups.value.flatMap((group) => parseFilterGroup(group, columns, columnTypes)))

  const setFilterGroups = (groups: FilterGroup[]) => {
    const router = useRouter()

    router.replace({
      query: filterGroupsToQuery({ ...$route.query }, groups),
    })
  }

  const removeFilter = (filter: { field: string; querySign: string; negated?: boolean }) => {
    setFilterGroups(filterGroups.value.map((group) => deleteFilterFromGroup(group, filter)))
  }

  // ajoute la condition au dernier groupe (combinée par ET), ou au groupe d'index donné
  const writeFilter = (filter: WritableFilter, index?: number) => {
    const groups = writeFilterInGroups(filterGroups.value, filter, index)
    if (!groups) return

    setFilterGroups(groups)
  }

  const encodePath = (path: string) => {
    const [base, query] = path.split('?')
    if (!query) return path
    const encodedQuery = query
      .split('&')
      .map((param) => {
        const [key, value] = param.split('=')
        if (key.includes('filters')) {
          const finalKey = encodeURIComponent(key)
            .replace(/%5B/g, '[')
            .replace(/%5D/g, ']')
            .replace(/%25/g, '%')
          return `${finalKey}=${encodeURIComponent(value)}`
        }
        return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
      })
      .join('&')
    return `${base}?${encodedQuery}`
  }

  const removeAllFilters = () => {
    setFilterGroups([])
  }

  return {
    filterGroups,
    setFilterGroups,
    countFilters,
    hasFilters,
    getFilters,
    removeFilter,
    writeFilter,
    comparatorTypes,
    fieldTypes,
    encodePath,
    removeAllFilters,
  }
}

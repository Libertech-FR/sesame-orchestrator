import type { QTableProps } from "quasar"
import type { LocationQueryValue } from "vue-router"

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

const comparatorTypes = ref<ComparatorType[]>([
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
    querySign: '>=',
    value: '>=',
    icon: 'mdi-greater-than-or-equal',
    type: ['number', 'date'],
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
    querySign: '<=',
    value: '<=',
    icon: 'mdi-less-than-or-equal',
    type: ['number', 'date'],
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
    type: ['array'],
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
  const match = key.match(/^(\:|\?|\#|\!|\>|\<|\^|\@)+/)

  if (!match) return null

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

const getSearchString = (columns: Ref<QTableProps['columns'] & { type: string }[]>, search: LocationQueryValue | LocationQueryValue[], fieldLabel: string) => {
  const field = columns.value?.find((f) => f.name === fieldLabel.replace('[]', ''))
  console.log('field', fieldLabel, field)
  if (!field) return ''
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
  // if (field?.type === 'date') {
  //   return dayjs(search).format('DD/MM/YYYY')
  // }
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

export function useFiltersQuery(columns: Ref<QTableProps['columns'] & { type: string }[]>) {
  const $route = useRoute()

  const countFilters = computed(() => {
    const filters = Object.keys($route.query).filter((key) => key.startsWith(FILTER_PREFIX))
    return filters.length
  })

  const hasFilters = computed(() => countFilters.value > 0)

  const getFilters = computed(() => {
    const filters: Record<string, { label: string; field: string; comparator: string; value: string; querySign: string; search: string }> = {}

    for (const key in $route.query) {
      if (key.includes(FILTER_PREFIX)) {
        const filteredKey = key.replace(FILTER_PREFIX, '').replace(FILTER_SUFFIX, '')
        const extract = extractComparator(filteredKey)

        if (!extract) {
          console.warn(`No comparator found for filter key: ${key} ${filteredKey}`)
          continue
        }

        const label = getLabelByName(columns, extract.field) || extract.field
        const rawValue = `${$route.query[key]}`
        const search = getSearchString(columns, $route.query[key], extract.field)

        if (!search || search === '') {
          console.warn(`Invalid search for filter key: ${key} ${filteredKey}`, {
            label,
            search,
          })
          continue
        }

        const comparatorObj = getComparatorObject(extract.comparator, rawValue)

        filters[key] = {
          label,
          search,
          field: extract.field,
          value: rawValue,
          querySign: extract.comparator,
          comparator: comparatorObj ? comparatorObj.label.toLowerCase() : getComparatorLabel(extract.comparator),
        }
      }
    }

    return filters
  })

  const removeFilter = (filter: { field: string; querySign: string }) => {
    const router = useRouter()
    const query = { ...$route.query }
    const filterKey = `${FILTER_PREFIX}${filter.querySign}${filter.field}${FILTER_SUFFIX}`

    delete query[filterKey]

    router.replace({
      query,
    })
  }

  const writeFilter = (filter: { key: string; operator: string; value: string, min?: string, max?: string }) => {
    const router = useRouter()
    const query = { ...$route.query }
    const comparator = comparatorTypes.value.find((comp) => comp.value === filter.operator)
    const filterKey = `${FILTER_PREFIX}${comparator?.querySign}${filter.key}${FILTER_SUFFIX}`
    const value = comparator?.multiplefields ? filter.value.split(',').map((v) => v.trim()) : filter.value.trim()

    // Remove any existing filter for the same field
    for (const key in query) {
      if (key.startsWith(FILTER_PREFIX) && key.endsWith(FILTER_SUFFIX)) {
        const filteredKey = key.replace(FILTER_PREFIX, '').replace(FILTER_SUFFIX, '')
        const extract = extractComparator(filteredKey)

        if (extract && extract.field === filter.key) {
          delete query[`${FILTER_PREFIX}${extract.comparator}${extract.field}${FILTER_SUFFIX}`]
        }
      }
    }

    query[filterKey] = `${comparator?.prefix || ''}${value}${comparator?.suffix || ''}`

    router.replace({
      query,
    })
  }

  return {
    countFilters,
    hasFilters,
    getFilters,
    removeFilter,
    writeFilter,
    comparatorTypes,
    fieldTypes,
  }
}

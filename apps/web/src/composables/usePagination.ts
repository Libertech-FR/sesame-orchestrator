import { isEqual } from 'radash'
import type { MultiWatchSources } from 'vue'
import type { LocationQueryRaw, LocationQueryValue } from 'vue-router'

const defaultSortBy = 'metadata.lastUpdatedAt'
const defaultDescending = true

interface Pagination {
  sortBy?: string | null
  descending?: boolean
  page?: number
  rowsPerPage?: number
  rowsNumber?: number
}

export function usePagination(options?: { name?: string }) {
  options = {
    name: 'global',
    ...options,
  }

  const DEFAULT_PAGE = 1
  const DEFAULT_ROW_PIXEL_HEIGHT = 33

  const $route = useRoute()
  const $router = useRouter()

  const defLimit = useState(`pagination_default_limit_${options.name!}`, () => -1)
  const pagination = useState(`pagination_settings_${options.name!}`, () => <Pagination>{})

  const initializePagination = async (options?: { internalInnerHeight?: number, rowPixelHeight?: number, globalOffset?: number }) => {
    options = {
      internalInnerHeight: window.innerHeight,
      globalOffset: 44,
      ...options,
    }

    const rowPixelHeight = options.rowPixelHeight || DEFAULT_ROW_PIXEL_HEIGHT
    defLimit.value = Math.floor((options.internalInnerHeight! - options.globalOffset!) / rowPixelHeight)

    pagination.value.page = parseInt($route.query.page as string) || DEFAULT_PAGE
    pagination.value.rowsPerPage = parseInt($route.query.limit as string) || defLimit.value

    setSortOptions($route.query)
    await paginationQuery()
  }

  const setSortOptions = (query: { [x: string]: LocationQueryValue | LocationQueryValue[] }) => {
    if (!pagination.value) return

    for (const key in query) {
      if (key.startsWith('sort')) {
        const sortKey = key.replace('sort[', '').replace(/\]/g, '')
        const sortDirection = query[key] === 'desc' ? 'desc' : 'asc'
        pagination.value.sortBy = sortKey
        pagination.value.descending = sortDirection === 'desc'
      }
    }
  }

  const onRequest = async (props: { pagination: Pagination, filter: any, getCellValue: any }) => {
    const { page, rowsPerPage, sortBy, descending } = props.pagination

    pagination.value.page = page
    pagination.value.rowsPerPage = rowsPerPage
    pagination.value.sortBy = sortBy
    pagination.value.descending = descending

    await paginationQuery()
  }

  const useHttpPaginationOptions = (): { query: Ref<{ [key: string]: any }>, immediate?: boolean, watch: MultiWatchSources | false } => {
    const query = ref({
      ...getDefaults(),
      ...$route.query,
    })

    return {
      query,
      immediate: false,
      watch: false,
    }
  }

  const useHttpPaginationReactive = async ({ query }, execute = () => { }) => {
    let pendingController: AbortController | null = null

    watchDebounced(
      () => ({ ...getDefaults(), ...$route.query }),
      async (newQuery) => {
        if (JSON.stringify(newQuery) !== JSON.stringify(query.value)) {
          query.value = newQuery

          // Annuler la requête précédente si elle existe
          if (pendingController) {
            pendingController.abort()
          }

          // Créer un nouveau controller pour cette requête
          pendingController = new AbortController()

          try {
            await execute()
          } catch (error: any) {
            // Ignorer les erreurs d'annulation
            if (error.name !== 'AbortError') {
              throw error
            }
          } finally {
            pendingController = null
          }
        }
      },
      { debounce: 300, deep: true },
    )

    if (parseInt(`${query.value.limit}`) !== -1) {
      await execute()
    }
  }

  const paginationQuery = async () => {
    let sortKey = `sort[${defaultSortBy}]`
    let sortDirection = defaultDescending ? 'desc' : 'asc'
    if (pagination.value.sortBy) {
      sortKey = `sort[${pagination.value.sortBy}]`
      sortDirection = pagination.value.descending ? 'desc' : 'asc'
    }
    const query = removeSortKey()

    const newQuery = <LocationQueryRaw>{
      ...query,
      page: `${pagination.value.page}`,
      limit: `${pagination.value.rowsPerPage}`,
      [sortKey]: sortDirection,
    }

    if (isEqual(query, newQuery)) {
      return
    }

    $router.replace({
      query: newQuery,
    })
  }

  function removeSortKey() {
    const query = { ...$route.query }
    for (const key in query) {
      if (key.startsWith('sort[')) {
        delete query[key]
      }
    }
    return query
  }

  const updatePaginationData = (data: { total?: number }) => {
    if (data?.total) pagination.value.rowsNumber = data.total
  }

  const onUpdatePagination = (data) => {
    return {}
  }

  const getDefaults = () => {
    return {
      page: '' + (parseInt($route.query.page as string) || DEFAULT_PAGE),
      limit: '' + (parseInt($route.query.limit as string) || defLimit.value),
    }
  }

  return {
    pagination,

    useHttpPaginationOptions,
    useHttpPaginationReactive,
    initializePagination,
    onRequest,
    paginationQuery,
    onUpdatePagination,
    updatePaginationData,
    getDefaults,
  }
}

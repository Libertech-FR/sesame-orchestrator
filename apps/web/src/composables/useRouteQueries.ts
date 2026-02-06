export function useRouteQueries(payload?: { queryHandler?: (url: URL, data?: {}) => void }) {
  const $route = useRoute()
  const $router = useRouter()

  if (!payload) payload = {}
  if (!payload?.queryHandler) {
    payload.queryHandler = (url: URL, data?: object) => {
      if (!data) return

      for (const [key, value] of Object.entries(data)) {
        if (value) {
          url.searchParams.set(key, value)
        } else {
          url.searchParams.delete(key)
        }
      }
    }
  }

  const toPathWithQueries = (path = '/', data?: {}, anchor?: string) => {
    const url = new URL(`${path}`, window.location.origin)

    for (const key in $route.query) {
      if (typeof $route.query[key] !== 'undefined' && $route.query[key] !== null) {
        url.searchParams.set(key, `${$route.query[key]}`)
      }
    }

    if (payload?.queryHandler) payload?.queryHandler(url, data)

    return url.pathname + url.search + (anchor ? `#${anchor}` : '')
  }

  const navigateToTab = async (path: string, data?: {}, anchor?: string) => {
    try {
      await $router.replace(toPathWithQueries(path, data, anchor))
    } catch (error) {
      if ((error as any)?.message?.includes('redundant navigation')) {
        return
      }
      console.warn('Navigation error:', error)
    }
  }

  return {
    toPathWithQueries,
    navigateToTab,
  }
}

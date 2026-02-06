export default defineNuxtPlugin((nuxtApp) => {
  if (typeof window === 'undefined') return

  const router = (nuxtApp as any).$router
  if (!router) return

  const initial = (globalThis as any).__SESAME_INITIAL_HASH || ''
  if (!initial) return

  // Restore the captured initial hash once the router is ready, if the
  // router removed it during initial navigation.
  router.isReady().then(() => {
    try {
      if (!window.location.hash && initial) {
        const base = `${window.location.pathname}${window.location.search}`
        history.replaceState(null, '', `${base}${initial}`)
        console.log('[restore-initial-hash] restored hash=', initial)
      }
    } catch (e) {
      // ignore errors
    }
  })

  return {}
})

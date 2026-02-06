export default defineNuxtPlugin((nuxtApp) => {
  const router = nuxtApp.$router as any
  if (!router) return

  function escapeHashSelector(hash: string): string {
    const raw = hash.startsWith('#') ? hash.slice(1) : hash
    let decoded: string
    try {
      decoded = decodeURIComponent(raw)
    } catch (_err) {
      decoded = raw
    }

    if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
      return `#${CSS.escape(decoded)}`
    }

    return `#${decoded.replace(/(["'!#$%&\\(\\)\\*\\+,\\./:;<=\\>\\?@\\[\\]\\]\\^`\\{\\|\\}~\\s])/g, "\\$1")}`
  }

  const original = router.options?.scrollBehavior

  router.options = router.options || {}
  router.options.scrollBehavior = async (to: any, from: any, savedPosition: any) => {
    if (savedPosition) return savedPosition

    if (to?.hash) {
      const raw = to.hash.startsWith('#') ? to.hash.slice(1) : to.hash
      let decoded: string
      try {
        decoded = decodeURIComponent(raw)
      } catch (_err) {
        decoded = raw
      }

      if (decoded.includes('=') || decoded.includes('&')) {
        return { left: 0, top: 0 }
      }

      const sel = escapeHashSelector(to.hash)
      return { el: sel }
    }

    if (typeof original === 'function') {
      try {
        return await original(to, from, savedPosition)
      } catch (e) {
        // fallthrough
      }
    }

    return { left: 0, top: 0 }
  }
})

// Capture the initial location.hash as early as possible on the client
// so components can read it even if the router mutates the URL later.
; (function captureInitialHash() {
  try {
    const h = typeof window !== 'undefined' ? window.location.hash : ''
      ; (globalThis as any).__SESAME_INITIAL_HASH = h || ''
    console.log('[capture-initial-hash] captured initial hash=', (globalThis as any).__SESAME_INITIAL_HASH)
  } catch (e) {
    // ignore
  }
})()

export default defineNuxtPlugin(() => {
  // no-op plugin to ensure Nuxt includes this file early in client build
  return {}
})

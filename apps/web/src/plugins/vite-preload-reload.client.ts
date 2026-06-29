/**
 * Après un hot reload partiel, Vite peut tenter de charger un ancien chunk `/_nuxt/*.js` (404).
 * Recharge la page pour resynchroniser le graphe de modules.
 */
export default defineNuxtPlugin(() => {
  if (!import.meta.dev) return

  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault()
    window.location.reload()
  })
})

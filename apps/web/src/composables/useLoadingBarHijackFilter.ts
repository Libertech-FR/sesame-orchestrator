/** Requêtes en arrière-plan : ne pas déclencher la barre Quasar (XHR hijack). */
const BACKGROUND_URL_PARTS = [
  '/socket.io',
  '/core/backends/sync-progress',
  '/core/backends/daemon/status',
]

/**
 * Filtre Quasar LoadingBar / QAjaxBar : true = afficher la barre pour cette URL.
 * @see https://quasar.dev/vue-components/ajax-bar#hijackfilter
 */
export function loadingBarHijackFilter(url: string): boolean {
  if (typeof url !== 'string' || url.length === 0) {
    return true
  }

  return !BACKGROUND_URL_PARTS.some((part) => url.includes(part))
}

export const loadingBarDefaults = {
  color: 'white',
  size: '3px',
  position: 'top' as const,
  hijackFilter: loadingBarHijackFilter,
}

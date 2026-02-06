import type { RouteLocationNormalized, RouterScrollBehavior } from 'vue-router'

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

  // Basic fallback escaping for environments without CSS.escape
  return `#${decoded.replace(/(["'!#$%&\\(\\)\\*\\+,\\./:;<=\\>\\?@\\[\\]\\]\\^`\\{\\|\\}~\\s])/g, "\\$1")}`
}

export const scrollBehavior: RouterScrollBehavior = async (
  to: RouteLocationNormalized,
  _from,
  savedPosition,
) => {
  if (savedPosition) return savedPosition

  if (to.hash) {
    console.log('[router.options] scrollBehavior called with hash=', to.hash)
    const raw = to.hash.startsWith('#') ? to.hash.slice(1) : to.hash
    let decoded: string
    try {
      decoded = decodeURIComponent(raw)
    } catch (_err) {
      decoded = raw
    }

    console.log('[router.options] decoded hash=', decoded)

    // If the hash looks like key=value pairs (used by our app), don't try
    // to return an element selector — there is no DOM element with that id.
    if (decoded.includes('=') || decoded.includes('&')) {
      console.log('[router.options] hash looks like params, skipping element selection')
      return { left: 0, top: 0 }
    }

    // Otherwise return a selector-safe element reference.
    const sel = escapeHashSelector(to.hash)
    console.log('[router.options] selecting element=', sel)
    return { el: sel }
  }

  return { left: 0, top: 0 }
}

export default {
  scrollBehavior,
}

import { ref, watchEffect, onMounted, onBeforeUnmount, type Ref } from 'vue'
import { assign, shake } from 'radash'

export type HashState = Record<string, string | undefined>

export interface UseHashStateResult {
  state: Ref<HashState>
  set: (partial: HashState) => void
}

type WindowLike = {
  location: {
    hash: string
    pathname: string
    search: string
    href: string
    origin: string
  }
  history?: {
    replaceState?: (data: unknown, unused: string, url?: string | null) => void
  }
  addEventListener?: (type: string, listener: (...args: any[]) => void) => void
  removeEventListener?: (type: string, listener: (...args: any[]) => void) => void
}

/**
 * Obtains a window-like object when running in the browser. Guards against SSR contexts
 * where `globalThis.window` is not defined.
 *
 * @returns {WindowLike | undefined} The detected window replacement or `undefined` when unavailable.
 */
const getRuntimeWindow = (): WindowLike | undefined => {
  if (typeof globalThis === 'undefined') {
    return undefined
  }

  const maybeWindow = (globalThis as Record<string, unknown>)?.window as unknown

  if (typeof maybeWindow === 'object' && maybeWindow !== null) {
    const candidate = maybeWindow as Partial<WindowLike>
    if (candidate.location && typeof candidate.location === 'object') {
      return candidate as WindowLike
    }
  }

  return undefined
}

/**
 * Converts the hash fragment string into a plain object of key-value pairs.
 *
 * @param {string} hash - The raw hash string, with or without the leading `#`.
 * @returns {HashState} Parsed key-value mapping representing the hash parameters.
 */
function parseHash(hash: string): HashState {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash
  // If the hash was percent-encoded (older code used encodeURIComponent on the
  // full params string), decode it first so URLSearchParams can parse key/value
  // pairs correctly. Fall back to the raw value on malformed sequences.
  let decoded: string
  try {
    decoded = decodeURIComponent(raw)
  } catch (_err) {
    decoded = raw
  }

  const params = new URLSearchParams(decoded)
  const obj: HashState = {}

  params.forEach((value, key) => {
    obj[key] = value
  })

  return obj
}

/**
 * Serializes a hash state object into a hash fragment string while removing empty values.
 *
 * @param {HashState} obj - The hash state that should be converted back to a string.
 * @returns {string} The normalized hash fragment including the leading `#` when applicable.
 */
function stringifyHash(obj: HashState): string {
  const params = new URLSearchParams()
  const cleaned = shake(obj)

  for (const [key, value] of Object.entries(cleaned)) {
    params.set(key, value as string)
  }

  const s = params.toString()
  const result = s ? `#${s}` : ''
  return result
}

/**
 * Returns a selector-safe hash value (including leading `#`). Use this when
 * passing the hash to `querySelector` to avoid invalid selector warnings.
 */
export function safeHashSelector(hash: string): string {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash
  let decoded: string
  try {
    decoded = decodeURIComponent(raw)
  } catch (_err) {
    decoded = raw
  }

  const esc = typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
    ? CSS.escape(decoded)
    : decoded.replace(/(["'!#$%&\\(\\)\\*\\+,\\./:;<=\\>\\?@\\[\\]\\^`\\{\\|\\}~\\s])/g, "\\$1")

  return `#${esc}`
}

/**
 * Keeps a reactive record in sync with the location hash while gracefully handling
 * the absence of `window` (e.g., during SSR). Updates to the state reflect in the URL
 * without triggering navigation, and external hash changes hydrate the reactive state.
 *
 * @returns {UseHashStateResult} Wrapper around the reactive hash state and its mutator.
 */
export function useHashState(): UseHashStateResult {
  const state = ref<HashState>({})
  const isHydrated = ref(false)

  const readFromLocation = () => {
    const runtimeWindow = getRuntimeWindow()

    if (!runtimeWindow) {
      return
    }

    const { location } = runtimeWindow
    // Prefer the actual location.hash, but if the router already cleared it
    // on initial navigation, fall back to the hash captured early by the
    // `capture-initial-hash.client.ts` plugin.
    const initialHash = (globalThis as any).__SESAME_INITIAL_HASH as string | undefined
    const hashToRead = location.hash || initialHash || ''
    state.value = parseHash(hashToRead)
  }

  const writeToLocation = (): void => {
    const runtimeWindow = getRuntimeWindow()

    if (!runtimeWindow) {
      return
    }

    const newHash = stringifyHash(state.value)
    const { location } = runtimeWindow
    const base = `${location.pathname}${location.search}`

    // If we have a new serialized hash, use it. If serialization yields an
    // empty string, attempt to preserve a meaningful fragment: prefer
    // `location.hash`, else fall back to the initially captured hash from
    // `capture-initial-hash.client.ts` (if any). This avoids removing
    // router-provided fragments on initial load.
    const initialHashGlobal = (globalThis as any).__SESAME_INITIAL_HASH as string | undefined

    const preservedHash = location.hash || initialHashGlobal || ''

    let nextUrl: string
    if (newHash) {
      nextUrl = `${base}${newHash}`
    } else {
      nextUrl = preservedHash ? `${base}${preservedHash}` : base
    }

    ; (globalThis as any).__SESAME_INITIAL_HASH = newHash || preservedHash || ''

    if (nextUrl !== location.href.replace(location.origin, '')) {
      runtimeWindow.history?.replaceState?.(null, '', nextUrl)
    }
  }

  const onHashChange = (): void => {
    const runtimeWindow = getRuntimeWindow()

    if (!runtimeWindow) {
      return
    }

    const { location } = runtimeWindow
    state.value = parseHash(location.hash || '')
  }

  onMounted((): void => {
    readFromLocation()
    const runtimeWindow = getRuntimeWindow()

    if (!runtimeWindow) {
      return
    }

    // Defer hydration to the next macrotask so the router can complete its
    // initial navigation and populate `location.hash` if needed (avoids
    // clearing hashes set by the router during page reload/hydration).
    setTimeout(() => {
      // Re-read the location in case the router set the hash during navigation.
      readFromLocation()
      isHydrated.value = true
    }, 0)

    runtimeWindow.addEventListener?.('hashchange', onHashChange)
  })

  onBeforeUnmount(() => {
    const runtimeWindow = getRuntimeWindow()

    if (!runtimeWindow) {
      return
    }

    runtimeWindow.removeEventListener?.('hashchange', onHashChange)
  })

  watchEffect(() => {
    if (!isHydrated.value) {
      return
    }

    writeToLocation()
  })

  return {
    state,
    /**
     * Merges partial state updates into the existing hash state and propagates them to the URL.
     *
     * @param {HashState} partial - The subset of keys to update in the hash state.
     */
    set(partial: HashState): void {
      state.value = assign(state.value, partial) as HashState
      // When callers update the hash state via `set`, ensure the captured
      // initial hash reflects that immediately. This avoids races when the
      // user switches tabs or the router runs and clears the fragment.
      try {
        const newGlobal = stringifyHash(state.value)
        if (newGlobal) {
          ; (globalThis as any).__SESAME_INITIAL_HASH = newGlobal
        }
      } catch (_err) {
        // noop
      }
    },
  }
}

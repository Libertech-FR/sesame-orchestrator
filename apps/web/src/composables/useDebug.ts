import * as Monaco from 'monaco-editor'

export function useDebug() {
  const $q = useQuasar()
  const route = useRoute()
  const cachedDebug = ref<boolean | null>(null)

  const debug = computed({
    get: () => {
      if (cachedDebug.value === null) {
        cachedDebug.value = /yes|true|1|on/.test(`${localStorage.getItem('debug')}`)

        if (route.query.debug !== undefined) {
          cachedDebug.value = /yes|true|1|on/.test(`${route.query.debug}`)
        }
        localStorage.setItem('debug', cachedDebug.value ? '1' : '0')

        return cachedDebug.value
      }

      if (route.query.debug === undefined && cachedDebug.value !== null) {
        return cachedDebug.value
      }

      return /yes|true|1|on/.test(`${route.query.debug}`)
    },
    set: (value: boolean) => {
      const query = { ...route.query }

      if (value) {
        query.debug = '1'
        localStorage.setItem('debug', '1')
      } else {
        delete query.debug
        localStorage.setItem('debug', '0')
        cachedDebug.value = false
      }

      useRouter().replace({ query })
    },
  })

  const initDebug = () => {
    if (/yes|true|1|on/.test(`${localStorage.getItem('debug')}`)) {
      debug.value = true
      cachedDebug.value = true
    } else if (/no|false|0|off/.test(`${localStorage.getItem('debug')}`)) {
      debug.value = false
      cachedDebug.value = false
    }
  }

  const monacoOptions = computed<Monaco.editor.IStandaloneEditorConstructionOptions>(() => {
    return {
      theme: $q.dark.isActive ? 'vs-dark' : 'vs-light',
      readOnly: true,
      minimap: {
        enabled: true,
      },
      scrollBeyondLastColumn: 0,
      scrollBeyondLastLine: false,
    }
  })

  return { debug, initDebug, monacoOptions }
}

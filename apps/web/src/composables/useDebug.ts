export function useDebug() {
  const route = useRoute()

  const debug = computed({
    get: () => {
      if (/yes|true|1|on/.test(`${localStorage.getItem('debug')}`)) {
        debug.value = true
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
      }
      useRouter().replace({ query })
    },
  })

  const initDebug = () => {
    if (/yes|true|1|on/.test(`${localStorage.getItem('debug')}`)) {
      debug.value = true
    }
  }

  return { debug, initDebug }
}

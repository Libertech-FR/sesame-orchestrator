export function useDebug() {
  const route = useRoute()

  const debug = computed(() => {
    return /yes|true|1|on/.test(`${route.query.debug}`)
  })

  return { debug }
}

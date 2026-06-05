import {
  formatSocketDebugPayload,
  formatSocketDebugSummary,
  formatSocketDebugTime,
  getSocketDebugDirectionMeta,
  useSocketIoDebug,
} from '~/composables/useSocketIoDebug'

const SOCKET_DEBUG_HEIGHT_STORAGE_KEY = 'sesame.socket-debug.panel-height'
const SOCKET_DEBUG_MIN_HEIGHT = 120

const getSocketDebugMaxHeight = (): number => Math.round(window.innerHeight * 0.85)

const loadSocketDebugPanelHeight = (): number => {
  const stored = Number(localStorage.getItem(SOCKET_DEBUG_HEIGHT_STORAGE_KEY))
  const fallback = Math.round(window.innerHeight * 0.5)

  if (Number.isFinite(stored) && stored > 0) {
    return Math.min(getSocketDebugMaxHeight(), Math.max(SOCKET_DEBUG_MIN_HEIGHT, stored))
  }

  return fallback
}

const debugDialog = ref(false)
const debugSocketDialog = ref(false)
const expandedSocketEntryId = ref<number | null>(null)
const socketDebugPanelHeight = ref(loadSocketDebugPanelHeight())
const debugNetworkLoading = ref(false)
const debugNetworkPayload = ref<Record<string, unknown> | null>(null)

let socketDebugResizeActive = false
let socketDebugResizeStartY = 0
let socketDebugResizeStartHeight = 0

export function useAppDebugPanels() {
  const { entries: socketDebugEntries, clearEntries: clearSocketDebug } = useSocketIoDebug()

  const debugSocketPanelStyle = computed(() => ({
    width: 'min(96vw, 1600px)',
    height: `${socketDebugPanelHeight.value}px`,
    maxHeight: `${getSocketDebugMaxHeight()}px`,
    margin: '0 auto',
    overflow: 'hidden',
  }))

  const debugNetworkFormatted = computed(() =>
    debugNetworkPayload.value ? JSON.stringify(debugNetworkPayload.value, null, 2) : '',
  )

  const loadDebugNetwork = async () => {
    debugNetworkLoading.value = true
    debugNetworkPayload.value = null
    try {
      const { $http } = useNuxtApp()
      debugNetworkPayload.value = (await $http.$get('/core/auth/debug/client-diagnostic')) as Record<string, unknown>
    } catch (err: unknown) {
      debugNetworkPayload.value = {
        error: err instanceof Error ? err.message : String(err),
      }
    } finally {
      debugNetworkLoading.value = false
    }
  }

  const openDebugNetwork = () => {
    debugDialog.value = true
  }

  const openDebugSocket = () => {
    debugSocketDialog.value = true
  }

  const onDebugDialogShow = () => {
    void loadDebugNetwork()
  }

  const onDebugSocketDialogShow = () => {
    expandedSocketEntryId.value = socketDebugEntries.value[0]?.id ?? null
  }

  const onSocketEntryExpand = (entryId: number, expanded: boolean) => {
    expandedSocketEntryId.value = expanded ? entryId : null
  }

  const clearSocketDebugEntries = () => {
    clearSocketDebug()
    expandedSocketEntryId.value = null
  }

  const onSocketDebugResizeMove = (event: MouseEvent) => {
    if (!socketDebugResizeActive) {
      return
    }

    const delta = socketDebugResizeStartY - event.clientY
    socketDebugPanelHeight.value = Math.min(
      getSocketDebugMaxHeight(),
      Math.max(SOCKET_DEBUG_MIN_HEIGHT, socketDebugResizeStartHeight + delta),
    )
  }

  const stopSocketDebugResize = () => {
    if (!socketDebugResizeActive) {
      return
    }

    socketDebugResizeActive = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    document.removeEventListener('mousemove', onSocketDebugResizeMove)
    document.removeEventListener('mouseup', stopSocketDebugResize)
    localStorage.setItem(SOCKET_DEBUG_HEIGHT_STORAGE_KEY, String(socketDebugPanelHeight.value))
  }

  const startSocketDebugResize = (event: MouseEvent) => {
    socketDebugResizeActive = true
    socketDebugResizeStartY = event.clientY
    socketDebugResizeStartHeight = socketDebugPanelHeight.value
    document.body.style.cursor = 'ns-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', onSocketDebugResizeMove)
    document.addEventListener('mouseup', stopSocketDebugResize)
  }

  return {
    debugDialog,
    debugSocketDialog,
    debugNetworkLoading,
    debugNetworkPayload,
    debugNetworkFormatted,
    socketDebugEntries,
    expandedSocketEntryId,
    debugSocketPanelStyle,
    openDebugNetwork,
    openDebugSocket,
    onDebugDialogShow,
    onDebugSocketDialogShow,
    onSocketEntryExpand,
    clearSocketDebugEntries,
    startSocketDebugResize,
    stopSocketDebugResize,
    formatSocketDebugTime,
    getSocketDebugDirectionMeta,
    formatSocketDebugSummary,
    formatSocketDebugPayload,
  }
}

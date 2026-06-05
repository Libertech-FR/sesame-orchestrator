import type { Socket } from 'socket.io-client'

export type SocketIoDebugDirection = 'emit' | 'receive' | 'lifecycle'

export type SocketIoDebugEntry = {
  id: number
  at: string
  namespace: string
  direction: SocketIoDebugDirection
  event: string
  payload: unknown
}

const MAX_ENTRIES = 200
const entries = ref<SocketIoDebugEntry[]>([])
let nextId = 1

function normalizePayload(args: unknown[]): unknown {
  if (args.length === 0) {
    return null
  }

  if (args.length === 1) {
    return args[0]
  }

  return args
}

export function useSocketIoDebug() {
  const { debug } = useDebug()

  const appendEntry = (entry: Omit<SocketIoDebugEntry, 'id' | 'at'>): void => {
    if (!debug.value) {
      return
    }

    entries.value = [
      {
        id: nextId++,
        at: new Date().toISOString(),
        ...entry,
      },
      ...entries.value,
    ].slice(0, MAX_ENTRIES)
  }

  const clearEntries = (): void => {
    entries.value = []
  }

  return {
    entries,
    appendEntry,
    clearEntries,
  }
}

export function formatSocketDebugTime(at: string): string {
  return new Date(at).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
  })
}

export function getSocketDebugDirectionMeta(direction: SocketIoDebugDirection): {
  icon: string
  color: string
  label: string
} {
  switch (direction) {
    case 'emit':
      return { icon: 'mdi-arrow-up-bold', color: 'blue-7', label: 'Émission' }
    case 'receive':
      return { icon: 'mdi-arrow-down-bold', color: 'green-7', label: 'Réception' }
    case 'lifecycle':
      return { icon: 'mdi-swap-horizontal', color: 'grey-7', label: 'Cycle de vie' }
  }
}

export function formatSocketDebugSummary(entry: SocketIoDebugEntry): string {
  const payload = entry.payload

  if (entry.event === 'message' && payload && typeof payload === 'object' && 'channel' in payload) {
    const message = payload as { channel?: string; payload?: unknown }
    const channel = message.channel || '?'
    const inner = message.payload

    if (inner && typeof inner === 'object' && inner !== null) {
      const keys = Object.keys(inner).slice(0, 5).join(', ')
      return keys ? `channel: ${channel} — ${keys}` : `channel: ${channel}`
    }

    return `channel: ${channel}`
  }

  if (payload === null || payload === undefined) {
    return '—'
  }

  if (typeof payload === 'string') {
    return payload.length > 140 ? `${payload.slice(0, 140)}…` : payload
  }

  try {
    const serialized = JSON.stringify(payload)
    return serialized.length > 160 ? `${serialized.slice(0, 160)}…` : serialized
  } catch {
    return String(payload)
  }
}

export function formatSocketDebugPayload(payload: unknown): string {
  if (payload === null || payload === undefined) {
    return '—'
  }

  try {
    return JSON.stringify(payload, null, 2)
  } catch {
    return String(payload)
  }
}

export function attachSocketIoDebug(socket: Socket, namespace: string): void {
  const { debug } = useDebug()
  const { appendEntry } = useSocketIoDebug()

  const maybeLog = (direction: SocketIoDebugDirection, event: string, payload: unknown): void => {
    if (!debug.value) {
      return
    }

    appendEntry({ namespace, direction, event, payload })
  }

  const originalEmit = socket.emit.bind(socket)
  socket.emit = ((event: string, ...args: unknown[]) => {
    maybeLog('emit', event, normalizePayload(args))
    return originalEmit(event, ...args)
  }) as Socket['emit']

  socket.onAny((event, ...args) => {
    maybeLog('receive', event, normalizePayload(args))
  })

  socket.on('connect', () => {
    maybeLog('lifecycle', 'connect', { socketId: socket.id })
  })

  socket.on('disconnect', (reason) => {
    maybeLog('lifecycle', 'disconnect', { reason })
  })

  socket.on('connect_error', (error) => {
    maybeLog('lifecycle', 'connect_error', {
      message: error instanceof Error ? error.message : String(error),
    })
  })
}

import type { ManagerOptions, Socket, SocketOptions } from 'socket.io-client'
import { tryUseNuxtApp, useRuntimeConfig } from '#app'

const STALE_SOCKET_IO_DISCONNECT_REASONS = new Set([
  'transport error',
  'transport close',
  'ping timeout',
  'io server disconnect',
])

/** Session Engine.IO invalide (ex. redémarrage API) alors que le namespace semble encore connecté. */
export function isStaleSocketIoDisconnectReason(reason: string): boolean {
  return STALE_SOCKET_IO_DISCONNECT_REASONS.has(reason)
}

/** Appelle `handler` sur erreur transport (ex. POST polling 400) puis retire les écouteurs. */
export function onSocketIoTransportFailure(socket: Socket, handler: () => void): () => void {
  let handled = false
  const runOnce = () => {
    if (handled) {
      return
    }
    handled = true
    cleanup()
    handler()
  }

  const onDisconnect = (reason: string) => {
    if (isStaleSocketIoDisconnectReason(reason)) {
      runOnce()
    }
  }
  const onError = () => runOnce()

  socket.on('disconnect', onDisconnect)
  socket.io.on('error', onError)

  const cleanup = () => {
    socket.off('disconnect', onDisconnect)
    socket.io.off('error', onError)
  }

  return cleanup
}

/** Même préfixe que le proxy `/api/**` → API (cf. `nuxt.config.ts`). */
export const SOCKET_IO_PATH = '/api/socket.io'

function readSocketIoPollingOnly(): boolean {
  const nuxtApp = tryUseNuxtApp()
  const fromApp = nuxtApp?.$config?.public?.socketIoPollingOnly
  if (fromApp !== undefined) {
    return Boolean(fromApp)
  }

  if (import.meta.client) {
    const injected = (window as { __NUXT__?: { config?: { public?: { socketIoPollingOnly?: boolean } } } }).__NUXT__?.config
      ?.public?.socketIoPollingOnly
    if (injected !== undefined) {
      return Boolean(injected)
    }
  }

  return Boolean(useRuntimeConfig().public.socketIoPollingOnly)
}

/**
 * Transports Socket.IO.
 * Contrôlé par `SESAME_SOCKET_IO_POLLING_ONLY` (défaut : true en dev, false en prod).
 */
export function socketIoTransports(): ('websocket' | 'polling')[] {
  return readSocketIoPollingOnly() ? ['polling'] : ['websocket', 'polling']
}

export function buildSocketIoClientOptions(auth: { id: string; key: string }): Partial<ManagerOptions & SocketOptions> {
  const pollingOnly = readSocketIoPollingOnly()

  return {
    path: SOCKET_IO_PATH,
    query: { id: String(auth.id), key: String(auth.key) },
    transports: socketIoTransports(),
    upgrade: !pollingOnly,
    reconnectionAttempts: 10,
    reconnectionDelay: 5_000,
    reconnectionDelayMax: 30_000,
  }
}

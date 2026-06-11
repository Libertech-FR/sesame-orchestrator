import type { ManagerOptions, SocketOptions } from 'socket.io-client'
import { tryUseNuxtApp, useRuntimeConfig } from '#app'

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

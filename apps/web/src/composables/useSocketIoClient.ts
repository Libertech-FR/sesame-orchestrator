import type { ManagerOptions, SocketOptions } from 'socket.io-client'

/** Même préfixe que le proxy `/api/**` → API (cf. `nuxt.config.ts` routeRules). */
export const SOCKET_IO_PATH = '/api/socket.io'

/** Polling d'abord en dev (proxy Nitro HTTP) ; upgrade WS via Vite. Prod : WS en priorité. */
export function socketIoTransports(): ('websocket' | 'polling')[] {
  return import.meta.dev ? ['polling', 'websocket'] : ['websocket', 'polling']
}

export function buildSocketIoClientOptions(auth: { id: string; key: string }): Partial<ManagerOptions & SocketOptions> {
  return {
    path: SOCKET_IO_PATH,
    query: { id: String(auth.id), key: String(auth.key) },
    transports: socketIoTransports(),
    reconnectionAttempts: 10,
  }
}

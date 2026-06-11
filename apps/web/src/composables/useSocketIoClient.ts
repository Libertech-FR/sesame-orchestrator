import type { ManagerOptions, SocketOptions } from 'socket.io-client'

/** Même préfixe que le proxy `/api/**` → API (cf. `nuxt.config.ts` routeRules). */
export const SOCKET_IO_PATH = '/api/socket.io'

/**
 * Dev : long-polling seul (le proxy Nuxt ne gère pas l'upgrade WS sur /api/socket.io).
 * Prod : WebSocket via le reverse-proxy, repli polling si besoin.
 */
export function socketIoTransports(): ('websocket' | 'polling')[] {
  return import.meta.dev ? ['polling'] : ['websocket', 'polling']
}

export function buildSocketIoClientOptions(auth: { id: string; key: string }): Partial<ManagerOptions & SocketOptions> {
  return {
    path: SOCKET_IO_PATH,
    query: { id: String(auth.id), key: String(auth.key) },
    transports: socketIoTransports(),
    upgrade: !import.meta.dev,
    reconnectionAttempts: 10,
  }
}

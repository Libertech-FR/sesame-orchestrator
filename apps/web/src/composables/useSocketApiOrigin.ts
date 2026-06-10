import type { ManagerOptions, SocketOptions } from 'socket.io-client'
import { tryUseNuxtApp, useAppConfig, useRuntimeConfig } from '#app'

/** WebSocket d'abord ; Socket.IO repasse en long-polling si le proxy bloque l'upgrade. */
export const SOCKET_IO_TRANSPORTS = ['websocket', 'polling'] as const

export function buildSocketIoClientOptions(auth: { id: string; key: string }): Partial<ManagerOptions & SocketOptions> {
  return {
    path: '/socket.io',
    query: { id: String(auth.id), key: String(auth.key) },
    transports: [...SOCKET_IO_TRANSPORTS],
    reconnectionAttempts: 10,
  }
}

type PublicRuntimeConfig = ReturnType<typeof useRuntimeConfig>['public']

function readPublicRuntimeConfig(): PublicRuntimeConfig {
  const nuxtApp = tryUseNuxtApp()
  if (nuxtApp?.$config?.public) {
    return nuxtApp.$config.public as PublicRuntimeConfig
  }

  if (import.meta.client) {
    const injected = (window as { __NUXT__?: { config?: { public?: PublicRuntimeConfig } } }).__NUXT__?.config?.public
    if (injected) {
      return injected
    }
  }

  return useRuntimeConfig().public
}

function resolveBrowserApiPort(publicConfig: PublicRuntimeConfig): number {
  const publicPort = Number(publicConfig.socketPublicApiPort)
  if (publicPort > 0) {
    return publicPort
  }

  const internalPort = Number(publicConfig.socketApiPort)
  if (internalPort > 0) {
    return internalPort
  }

  return 4000
}

function resolveDirectApiOrigin(hostname: string, publicConfig: PublicRuntimeConfig): string {
  const protocol = `${publicConfig.socketApiProtocol || 'http:'}`
  const port = resolveBrowserApiPort(publicConfig)
  return `${protocol}//${hostname}:${port}`
}

/**
 * Origine Socket.IO côté navigateur.
 *
 * Priorité :
 * 1. `SESAME_APP_PUBLIC_API_URL` si défini (prod / reverse-proxy).
 * 2. En dev, si le front et l'API publique sont sur des ports différents : connexion directe
 *    (ex. front `mactacx:3002` → API `mactacx:4002` via `SESAME_APP_PUBLIC_API_PORT`).
 * 3. Sinon : même origine que le front (Nitro proxifie `/socket.io` en long-polling).
 *
 * Note : `SESAME_APP_API_URL` (port interne, ex. 4000 dans Docker) sert au proxy serveur Nuxt,
 * pas à l'origine Socket.IO du navigateur.
 */
export function resolveSocketApiOrigin(): string {
  const publicConfig = readPublicRuntimeConfig()
  const configuredPublic = `${publicConfig.socketApiUrl || ''}`.trim()

  if (configuredPublic) {
    return new URL(configuredPublic).origin
  }

  if (import.meta.client) {
    const apiPort = resolveBrowserApiPort(publicConfig)
    const frontPort = Number(window.location.port) || (window.location.protocol === 'https:' ? 443 : 80)

    if (import.meta.dev && frontPort !== apiPort) {
      return resolveDirectApiOrigin(window.location.hostname, publicConfig)
    }

    return window.location.origin
  }

  const appConfig = useAppConfig()
  return `${appConfig.baseUrl || ''}`.replace(/\/$/, '')
}

/**
 * Origine API joignable depuis le navigateur pour Socket.IO.
 * Le proxy Nuxt (/api) gère le HTTP mais pas l'upgrade WebSocket en dev.
 */
export function resolveSocketApiOrigin(): string {
  const appConfig = useAppConfig()
  const runtimeConfig = useRuntimeConfig()
  const configuredPublic = `${runtimeConfig.public.socketApiUrl || ''}`.trim()
  const configuredBase = `${appConfig.baseUrl || ''}`.replace(/\/$/, '')

  if (configuredPublic) {
    return new URL(configuredPublic).origin
  }

  if (!import.meta.client) {
    return configuredBase
  }

  try {
    const api = new URL(configuredBase)
    const pageHost = window.location.hostname
    const loopback = api.hostname === '127.0.0.1' || api.hostname === 'localhost'

    if (loopback && pageHost !== api.hostname) {
      const port = api.port === '4000' ? '4002' : api.port || '4002'
      return `${window.location.protocol}//${pageHost}:${port}`
    }

    return api.origin
  } catch {
    return configuredBase
  }
}

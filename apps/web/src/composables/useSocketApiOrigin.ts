/**
 * Origine Socket.IO côté navigateur.
 * En dev/prod, le client se connecte à la même origine que le front ; Nitro/Vite proxifient `/socket.io` vers l'API.
 */
export function resolveSocketApiOrigin(): string {
  if (import.meta.client) {
    return window.location.origin
  }

  const appConfig = useAppConfig()
  const runtimeConfig = useRuntimeConfig()
  const configuredPublic = `${runtimeConfig.public.socketApiUrl || ''}`.trim()

  if (configuredPublic) {
    return new URL(configuredPublic).origin
  }

  return `${appConfig.baseUrl || ''}`.replace(/\/$/, '')
}

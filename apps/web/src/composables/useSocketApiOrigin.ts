/**
 * Origine Socket.IO côté navigateur.
 * Par défaut : même origine que le front (Nitro/Vite proxifient `/socket.io` vers l'API).
 * Si `SESAME_APP_PUBLIC_API_URL` est défini : connexion directe à l'API (requis quand le
 * reverse-proxy route `/socket.io` vers le port 4000 ou que le proxy Nitro n'est pas joignable).
 */
export function resolveSocketApiOrigin(): string {
  const runtimeConfig = useRuntimeConfig()
  const configuredPublic = `${runtimeConfig.public.socketApiUrl || ''}`.trim()

  if (configuredPublic) {
    return new URL(configuredPublic).origin
  }

  if (import.meta.client) {
    return window.location.origin
  }

  const appConfig = useAppConfig()
  return `${appConfig.baseUrl || ''}`.replace(/\/$/, '')
}

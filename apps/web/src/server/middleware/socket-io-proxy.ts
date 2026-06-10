import { defineEventHandler, proxyRequest } from 'h3'

const DEFAULT_API_URL = 'http://127.0.0.1:4000'

function resolveApiBaseUrl(): string {
  return (process.env.SESAME_APP_API_URL || DEFAULT_API_URL).replace(/\/$/, '')
}

export default defineEventHandler(async (event) => {
  const url = event.node.req.url || ''
  if (!url.startsWith('/socket.io')) {
    return
  }

  // proxyRequest (h3) ne gère pas l'upgrade WebSocket — laisser devProxy / reverse-proxy s'en charger.
  if (event.node.req.headers.upgrade?.toLowerCase() === 'websocket') {
    return
  }

  return proxyRequest(event, `${resolveApiBaseUrl()}${url}`)
})

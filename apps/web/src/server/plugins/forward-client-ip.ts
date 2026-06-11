import { defineNitroPlugin } from 'nitropack/runtime'
import { applyForwardClientIpHeaders } from '../utils/forward-client-ip'

function isApiProxyPath(url: string): boolean {
  return url === '/api' || url.startsWith('/api/')
}

/** Pose X-Forwarded-For / X-Real-IP avant le proxy @nuxt-alt/proxy. */
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('request', (event) => {
    const url = event.node.req.url || ''
    if (!isApiProxyPath(url)) {
      return
    }

    applyForwardClientIpHeaders(event.node.req.headers, event.node.req.socket.remoteAddress)
  })
})

import { defineEventHandler, getRequestHeader } from 'h3'

function normalizeRemoteAddress(value: string | undefined): string | null {
  if (!value) {
    return null
  }

  const normalized = value.trim()
  if (!normalized) {
    return null
  }

  return normalized.startsWith('::ffff:') ? normalized.slice(7) : normalized
}

function appendForwardedFor(currentValue: string | undefined, remoteAddress: string): string {
  if (!currentValue?.trim()) {
    return remoteAddress
  }

  return `${currentValue}, ${remoteAddress}`
}

export default defineEventHandler((event) => {
  const url = event.node.req.url || ''
  if (!url.startsWith('/api/')) {
    return
  }

  const remoteAddress = normalizeRemoteAddress(event.node.req.socket.remoteAddress)
  if (!remoteAddress) {
    return
  }

  const currentForwardedFor = getRequestHeader(event, 'x-forwarded-for')
  event.node.req.headers['x-forwarded-for'] = appendForwardedFor(currentForwardedFor, remoteAddress)

  if (!getRequestHeader(event, 'x-real-ip')) {
    event.node.req.headers['x-real-ip'] = currentForwardedFor?.split(',')[0]?.trim() || remoteAddress
  }
})

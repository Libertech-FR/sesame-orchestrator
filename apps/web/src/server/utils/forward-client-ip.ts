export function normalizeRemoteAddress(value: string | undefined | null): string | null {
  if (!value) {
    return null
  }

  const normalized = value.trim()
  if (!normalized) {
    return null
  }

  return normalized.startsWith('::ffff:') ? normalized.slice(7) : normalized
}

function headerValue(value: string | string[] | undefined): string | undefined {
  if (typeof value === 'string') {
    return value
  }

  if (Array.isArray(value) && typeof value[0] === 'string') {
    return value[0]
  }

  return undefined
}

function resolveOriginalClientIp(remoteAddress: string, xForwardedFor: string | undefined): string {
  const fromXff = xForwardedFor?.split(',')[0]?.trim()
  return normalizeRemoteAddress(fromXff) || remoteAddress
}

export function buildForwardedClientIpHeaders(
  remoteAddress: string | null | undefined,
  existingXForwardedFor: string | undefined,
  existingXRealIp: string | undefined,
): { xForwardedFor: string; xRealIp: string } | null {
  const normalizedRemote = normalizeRemoteAddress(remoteAddress)
  if (!normalizedRemote) {
    return null
  }

  const clientIp = resolveOriginalClientIp(normalizedRemote, existingXForwardedFor)
  const xForwardedFor = existingXForwardedFor?.trim()
    ? `${existingXForwardedFor}, ${normalizedRemote}`
    : normalizedRemote

  return {
    xForwardedFor,
    xRealIp: existingXRealIp?.trim() || clientIp,
  }
}

export function applyForwardClientIpHeaders(
  headers: Record<string, string | string[] | undefined>,
  remoteAddress: string | null | undefined,
): void {
  const forwarded = buildForwardedClientIpHeaders(
    remoteAddress,
    headerValue(headers['x-forwarded-for']),
    headerValue(headers['x-real-ip']),
  )

  if (!forwarded) {
    return
  }

  headers['x-forwarded-for'] = forwarded.xForwardedFor

  if (!headerValue(headers['x-real-ip'])) {
    headers['x-real-ip'] = forwarded.xRealIp
  }
}

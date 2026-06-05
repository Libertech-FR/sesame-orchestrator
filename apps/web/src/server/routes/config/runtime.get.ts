import { defineEventHandler } from '#imports'

const SENSITIVE_KEY_PATTERN = /(SECRET|PASSWORD|PASSWD|_KEY$|TOKEN|PRIVATE|CREDENTIAL|DSN|AUTH_|API_KEY)/i
const URI_KEY_PATTERN = /(URI|URL|DSN|MONGO|REDIS|SMPP)/i

function isSensitiveEnvKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERN.test(key)
}

function maskSensitiveValue(key: string, value: string): { value: string; sensitive: boolean } {
  if (!value) {
    return { value: '', sensitive: isSensitiveEnvKey(key) }
  }

  if (isSensitiveEnvKey(key)) {
    return { value: '***', sensitive: true }
  }

  if (URI_KEY_PATTERN.test(key) && /^[a-z][a-z0-9+.-]*:\/\//i.test(value)) {
    try {
      const url = new URL(value)
      let masked = false

      if (url.username) {
        url.username = '***'
        masked = true
      }

      if (url.password) {
        url.password = '***'
        masked = true
      }

      if (masked) {
        return { value: url.toString(), sensitive: true }
      }
    } catch {
      // ignore invalid URI
    }
  }

  return { value, sensitive: false }
}

export default defineEventHandler(() => {
  const envVariables = Object.keys(process.env)
    .filter((key) => {
      if (key.startsWith('SESAME_') || key.startsWith('NUXT_')) {
        return true
      }

      return ['NODE_ENV', 'TZ', 'LANG', 'BUILD_VERSION', 'GIT_BRANCH', 'GIT_COMMIT', 'DOCKER_TAG'].includes(key)
    })
    .sort((a, b) => a.localeCompare(b))
    .map((key) => {
      const rawValue = process.env[key] || ''
      const masked = maskSensitiveValue(key, rawValue)

      return {
        key,
        value: masked.value,
        sensitive: masked.sensitive || isSensitiveEnvKey(key),
      }
    })

  return {
    process: {
      pid: process.pid,
      uptimeSeconds: Number(process.uptime().toFixed(2)),
      cwd: process.cwd(),
    },
    environment: {
      web: envVariables,
    },
  }
})

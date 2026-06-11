import { useAuth, useQuasar } from '#imports'
import { startAuthentication } from '@simplewebauthn/browser'
import type { AuthenticationResponseJSON, PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/types'

type MfaStepUpResponse = {
  access_token: string
  refresh_token?: string
}

type HttpMethod = (...args: unknown[]) => Promise<unknown>
type HttpClient = Record<string, unknown> & {
  $post?: HttpMethod
}
type AuthUser = {
  mfaEnabled?: boolean
  totpEnabled?: boolean
  webAuthnEnabled?: boolean
}
type AuthWithTokens = {
  setUserToken?: (token: string, refreshToken?: string) => Promise<unknown>
  tokenStrategy?: {
    token?: {
      set?: (token: string) => unknown
      sync?: () => unknown
    }
    refreshToken?: {
      set?: (token: string) => unknown
    }
  }
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : undefined
}

function getAuthUser(auth: unknown): AuthUser {
  const user = asRecord(asRecord(auth)?.user)
  const unwrappedUser = asRecord(user?.value) || user
  return (unwrappedUser || {}) as AuthUser
}

function extractStepUpTokens(response: unknown): MfaStepUpResponse {
  const payload = extractHttpPayload(response)
  const access_token = typeof payload.access_token === 'string' ? payload.access_token.trim() : ''
  const refresh_token = typeof payload.refresh_token === 'string' ? payload.refresh_token.trim() : undefined
  return { access_token, refresh_token }
}

async function setAuthTokens(auth: unknown, response: MfaStepUpResponse): Promise<void> {
  const authApi = auth as AuthWithTokens
  if (typeof authApi?.setUserToken === 'function') {
    await authApi.setUserToken(response.access_token, response.refresh_token)
    return
  }

  const tokenStrategy = authApi?.tokenStrategy
  if (typeof tokenStrategy?.token?.set === 'function') {
    tokenStrategy.token.set(response.access_token)
    tokenStrategy.token.sync?.()
  }
  if (response.refresh_token && typeof tokenStrategy?.refreshToken?.set === 'function') {
    tokenStrategy.refreshToken.set(response.refresh_token)
  }
}

function extractHttpPayload(response: unknown): Record<string, unknown> {
  const base = asRecord(response) || {}
  const topData = asRecord(base.data)
  const topUnderscoreData = asRecord(base._data)
  const nestedData = asRecord(topData?.data)
  const nestedUnderscoreData = asRecord(topUnderscoreData?.data)
  const candidates = [nestedData, nestedUnderscoreData, topData, topUnderscoreData, base]
  return candidates.find((candidate): candidate is Record<string, unknown> => Boolean(candidate)) || {}
}

function extractWebAuthnOptions(payload: Record<string, unknown>): PublicKeyCredentialRequestOptionsJSON | null {
  const nestedOptions = asRecord(payload.options)
  const candidate = nestedOptions || payload
  return typeof candidate.challenge === 'string' ? (candidate as unknown as PublicKeyCredentialRequestOptionsJSON) : null
}

function isMfaRequiredError(error: unknown): boolean {
  const errorRecord = asRecord(error)
  const responseData = asRecord(asRecord(errorRecord?.response)?._data)
  const errorData = asRecord(errorRecord?.data)
  const statusCode = responseData?.statusCode || errorData?.statusCode
  const rawMessage = responseData?.message || errorData?.message
  const message = typeof rawMessage === 'string' ? rawMessage.trim() : ''
  return statusCode === 403 && message.toLowerCase() === 'mfa required'
}

export default defineNuxtPlugin((nuxtApp) => {
  const $q = useQuasar()
  const auth = useAuth()
  let rawHttpRef: HttpClient | null = null

  let inFlightStepUp: Promise<void> | null = null

  const isStepUpContext = (): boolean => {
    try {
      const r = useRoute()
      const path = typeof r?.path === 'string' ? r.path : r?.fullPath || ''
      return path.startsWith('/settings') || path.startsWith('/profile')
    } catch {
      return false
    }
  }
  const ensureStepUp = async () => {
    if (inFlightStepUp) return await inFlightStepUp
    if (!rawHttpRef) throw new Error('HTTP client not ready')

    inFlightStepUp = (async () => {
      // Ensure we have the latest session user payload.
      try {
        await auth.fetchUser()
      } catch {
        // ignore
      }

      const user = getAuthUser(auth)
      const mfaEnabled = user?.mfaEnabled === true

      if (mfaEnabled) {
        const post = rawHttpRef.$post
        if (typeof post !== 'function') throw new Error('HTTP client not ready')

        const canUseWebAuthn =
          user?.webAuthnEnabled === true &&
          typeof window !== 'undefined' &&
          typeof window.PublicKeyCredential !== 'undefined'
        // Prefer TOTP when both methods are available so users without a FIDO key can proceed immediately.
        const shouldUseWebAuthn = canUseWebAuthn && user?.totpEnabled !== true

        if (shouldUseWebAuthn) {
          try {
            const begin = await post('/core/auth/mfa/webauthn/begin')
            const beginPayload = extractHttpPayload(begin)
            const options = extractWebAuthnOptions(beginPayload)
            const challengeId = `${beginPayload.challengeId || ''}`.trim()
            if (!options || !challengeId) throw new Error('Invalid WebAuthn step-up begin payload')

            const response = (await startAuthentication(options)) as AuthenticationResponseJSON
            const finish = await post('/core/auth/mfa/webauthn/finish', {
              body: {
                challengeId,
                response,
              },
            })
            const finishTokens = extractStepUpTokens(finish)

            if (!finishTokens.access_token) throw new Error('Invalid WebAuthn step-up response (missing access_token)')
            await setAuthTokens(auth, finishTokens)
            return
          } catch (error) {
            if (user?.totpEnabled !== true) throw error
            $q.notify({
              type: 'warning',
              message: 'Validation FIDO impossible. Saisissez votre code TOTP.',
              position: 'top-right',
            })
          }
        }

        const otpCode = await new Promise<string>((resolve, reject) => {
          $q.dialog({
            title: 'Validation MFA requise',
            message: 'Entrez votre code TOTP à 6 chiffres pour continuer.',
            prompt: {
              model: '',
              type: 'text',
              autocomplete: 'one-time-code',
              autocorrect: 'off',
              autocapitalize: 'off',
              spellcheck: false,
              inputmode: 'numeric',
              pattern: '[0-9]{6}',
              maxlength: 6,
              minlength: 6,
              required: true,
              placeholder: '123456',
              label: 'Code TOTP',
              outlined: true,
              isValid: (val: string) => /^\d{6}$/.test(String(val || '').trim()),
            },
            cancel: false,
            persistent: true,
            color: 'warning',
            ok: { label: 'Valider', color: 'warning' },
          })
            .onOk((val: string) => resolve(val))
            .onCancel(() => reject(new Error('MFA step-up cancelled')))
            .onDismiss(() => reject(new Error('MFA step-up dismissed')))
        })

        const response = await post('/core/auth/mfa/step-up', {
          body: {
            otpCode: String(otpCode || '').trim(),
          },
        })
        const tokens = extractStepUpTokens(response)

        if (!tokens.access_token) throw new Error('Invalid step-up response (missing access_token)')

        await setAuthTokens(auth, tokens)
      } else {
        const password = await new Promise<string>((resolve, reject) => {
          $q.dialog({
            title: 'Validation requise',
            message: 'Pour continuer, confirmez votre mot de passe.',
            prompt: {
              model: '',
              type: 'password',
              isValid: (val: string) => String(val || '').trim().length > 0,
            },
            cancel: true,
            persistent: true,
            color: 'warning',
            ok: { label: 'Confirmer', color: 'warning' },
          })
            .onOk((val: string) => resolve(val))
            .onCancel(() => reject(new Error('Password confirmation cancelled')))
            .onDismiss(() => reject(new Error('Password confirmation dismissed')))
        })

        const post = rawHttpRef.$post
        if (typeof post !== 'function') throw new Error('HTTP client not ready')

        const response = await post('/core/auth/mfa/step-up', {
          body: {
            password: String(password || ''),
          },
        })
        const tokens = extractStepUpTokens(response)

        if (!tokens.access_token) throw new Error('Invalid step-up response (missing access_token)')

        await setAuthTokens(auth, tokens)
      }

      // Refresh user payload so subsequent UI has updated session info.
      try {
        await auth.fetchUser()
      } catch {
        // ignore
      }
    })()

    try {
      await inFlightStepUp
    } finally {
      inFlightStepUp = null
    }
  }

  const WRAP_MARK = '__sesameMfaWrapped__'

  const wrap = (fn: unknown, kind: 'read' | 'write') => {
    if (typeof fn !== 'function') return fn
    const httpFn = fn as HttpMethod & { [WRAP_MARK]?: boolean }
    if (httpFn[WRAP_MARK]) return httpFn
    const wrapped = async (...args: unknown[]) => {
      const url = args?.[0]
      // Never intercept the step-up endpoint itself.
      if (
        typeof url === 'string' &&
        (url.startsWith('/core/auth/mfa/step-up') || url.startsWith('/core/auth/mfa/webauthn/'))
      ) {
        return await httpFn(...args)
      }

      try {
        return await httpFn(...args)
      } catch (error: unknown) {
        if (!isMfaRequiredError(error)) throw error
        // Only step-up for explicit "save" / write intents.
        if (kind !== 'write') throw error
        // Only prompt for step-up on pages containing sensitive account/settings actions.
        if (!isStepUpContext()) throw error
        await ensureStepUp()
        return await httpFn(...args)
      }
    }
    ;(wrapped as HttpMethod & { [WRAP_MARK]?: boolean })[WRAP_MARK] = true
    return wrapped
  }

  const install = () => {
    const rawHttp = (nuxtApp as unknown as { $http?: HttpClient }).$http
    if (!rawHttp) return
    rawHttpRef = rawHttp

    // Patch common methods in-place (no reassignment of `$http`, which is getter-only).
    // Important: we ONLY patch write methods so the step-up modal appears only on "save"-like actions.
    // Re-apply when module plugins replace $http methods after our first install.
    for (const key of ['$post', '$put', '$patch', '$delete', 'post', 'put', 'patch', 'delete']) {
      const method = rawHttp[key]
      if (typeof method === 'function') {
        const bound = (method as HttpMethod).bind(rawHttp)
        rawHttp[key] = wrap(bound, 'write')
      }
    }
  }

  // Install ASAP if available, and also after app creation (module plugins may overwrite $http).
  install()
  nuxtApp.hook('app:created', install)
  nuxtApp.hook('app:mounted', install)
})


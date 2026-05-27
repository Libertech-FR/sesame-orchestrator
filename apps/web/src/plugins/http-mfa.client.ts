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
type TokenSetter = (token: string) => void

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : undefined
}

function isTokenSetter(value: unknown): value is TokenSetter {
  return typeof value === 'function'
}

function getAuthUser(auth: unknown): AuthUser {
  const user = asRecord(asRecord(auth)?.user)
  const unwrappedUser = asRecord(user?.value) || user
  return (unwrappedUser || {}) as AuthUser
}

function setRefreshToken(auth: unknown, refreshToken: string): void {
  const tokenStrategy = asRecord(asRecord(auth)?.tokenStrategy)
  const refreshTokenStore = asRecord(tokenStrategy?.refreshToken)
  const set = refreshTokenStore?.set
  if (isTokenSetter(set)) set(refreshToken)
}

function setAuthTokens(auth: unknown, response: MfaStepUpResponse): void {
  const tokenStrategy = asRecord(asRecord(auth)?.tokenStrategy)
  const tokenStore = asRecord(tokenStrategy?.token)
  const setAccessToken = tokenStore?.set
  if (isTokenSetter(setAccessToken)) setAccessToken(response.access_token)
  if (response.refresh_token) setRefreshToken(auth, response.refresh_token)
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
            const finish = (await post('/core/auth/mfa/webauthn/finish', {
              body: {
                challengeId,
                response,
              },
            })) as MfaStepUpResponse

            if (!finish?.access_token) throw new Error('Invalid WebAuthn step-up response (missing access_token)')
            setAuthTokens(auth, finish)
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

        const response = (await post('/core/auth/mfa/step-up', {
          body: {
            otpCode: String(otpCode || '').trim(),
          },
        })) as MfaStepUpResponse

        if (!response?.access_token) throw new Error('Invalid step-up response (missing access_token)')

        setAuthTokens(auth, response)
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

        const response = (await post('/core/auth/mfa/step-up', {
          body: {
            password: String(password || ''),
          },
        })) as MfaStepUpResponse

        if (!response?.access_token) throw new Error('Invalid step-up response (missing access_token)')

        setAuthTokens(auth, response)
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

  const PATCH_MARK = '__sesameMfaPatched__'

  const wrap = (fn: unknown, kind: 'read' | 'write') => {
    if (typeof fn !== 'function') return fn
    const httpFn = fn as HttpMethod
    return async (...args: unknown[]) => {
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
  }

  const install = () => {
    const rawHttp = (nuxtApp as unknown as { $http?: HttpClient }).$http
    if (!rawHttp) return
    rawHttpRef = rawHttp

    if (rawHttp[PATCH_MARK]) return
    rawHttp[PATCH_MARK] = true

    // Patch common methods in-place (no reassignment of `$http`, which is getter-only).
    // Important: we ONLY patch write methods so the step-up modal appears only on "save"-like actions.
    for (const key of ['$post', '$put', '$patch', '$delete', 'post', 'put', 'patch', 'delete']) {
      const method = rawHttp[key]
      if (typeof method === 'function') {
        rawHttp[key] = wrap((method as HttpMethod).bind(rawHttp), 'write')
      }
    }
  }

  // Install ASAP if available, and also after app creation (module plugins may overwrite $http).
  install()
  nuxtApp.hook('app:created', install)
  nuxtApp.hook('app:mounted', install)
})


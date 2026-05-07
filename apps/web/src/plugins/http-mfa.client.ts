import { useAuth } from '#imports'
import { useQuasar } from '#imports'

type MfaStepUpResponse = {
  access_token: string
  refresh_token?: string
}

function isMfaRequiredError(error: any): boolean {
  const statusCode = error?.response?._data?.statusCode || error?.data?.statusCode
  const rawMessage = error?.response?._data?.message || error?.data?.message
  const message = typeof rawMessage === 'string' ? rawMessage.trim() : ''
  return statusCode === 403 && message.toLowerCase() === 'mfa required'
}

export default defineNuxtPlugin((nuxtApp) => {
  const $q = useQuasar()
  const auth = useAuth()
  let rawHttpRef: any = null

  let inFlightStepUp: Promise<void> | null = null

  const isSettingsContext = (): boolean => {
    try {
      const r = useRoute()
      return typeof r?.fullPath === 'string' && r.fullPath.startsWith('/settings')
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

      const user = (auth as any)?.user?.value || (auth as any)?.user
      const mfaEnabled = user?.mfaEnabled === true

      if (mfaEnabled) {
        const otpCode = await new Promise<string>((resolve, reject) => {
          $q.dialog({
            title: 'Validation MFA requise',
            message: 'Entrez votre code TOTP à 6 chiffres pour continuer.',
            prompt: {
              model: '',
              type: 'text',
              isValid: (val: string) => /^\d{6}$/.test(String(val || '').trim()),
            },
            cancel: true,
            persistent: true,
            color: 'warning',
            ok: { label: 'Valider', color: 'warning' },
          })
            .onOk((val: string) => resolve(val))
            .onCancel(() => reject(new Error('MFA step-up cancelled')))
            .onDismiss(() => reject(new Error('MFA step-up dismissed')))
        })

        const response = (await rawHttpRef.$post('/core/auth/mfa/step-up', {
          body: {
            otpCode: String(otpCode || '').trim(),
          },
        })) as MfaStepUpResponse

        if (!response?.access_token) throw new Error('Invalid step-up response (missing access_token)')

        auth.tokenStrategy?.token?.set(response.access_token)
        if (response.refresh_token) {
          ;(auth.tokenStrategy as any)?.refreshToken?.set(response.refresh_token)
        }
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

        const response = (await rawHttpRef.$post('/core/auth/mfa/step-up', {
          body: {
            password: String(password || ''),
          },
        })) as MfaStepUpResponse

        if (!response?.access_token) throw new Error('Invalid step-up response (missing access_token)')

        auth.tokenStrategy?.token?.set(response.access_token)
        if (response.refresh_token) {
          ;(auth.tokenStrategy as any)?.refreshToken?.set(response.refresh_token)
        }
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

  const wrap = (fn: any, kind: 'read' | 'write') => {
    if (typeof fn !== 'function') return fn
    return async (...args: any[]) => {
      const url = args?.[0]
      // Never intercept the step-up endpoint itself.
      if (typeof url === 'string' && url.startsWith('/core/auth/mfa/step-up')) {
        return await fn(...args)
      }

      try {
        return await fn(...args)
      } catch (error: any) {
        if (!isMfaRequiredError(error)) throw error
        // Only step-up for explicit "save" / write intents.
        if (kind !== 'write') throw error
        // Only prompt for step-up on sensitive settings pages.
        if (!isSettingsContext()) throw error
        await ensureStepUp()
        return await fn(...args)
      }
    }
  }

  const install = () => {
    const rawHttp = (nuxtApp as any).$http
    if (!rawHttp) return
    rawHttpRef = rawHttp

    if ((rawHttp as any)[PATCH_MARK]) return
    ;(rawHttp as any)[PATCH_MARK] = true

    // Patch common methods in-place (no reassignment of `$http`, which is getter-only).
    // Important: we ONLY patch write methods so the step-up modal appears only on "save"-like actions.
    for (const key of ['$post', '$put', '$patch', '$delete', 'post', 'put', 'patch', 'delete']) {
      if (typeof (rawHttp as any)[key] === 'function') {
        ;(rawHttp as any)[key] = wrap((rawHttp as any)[key].bind(rawHttp), 'write')
      }
    }
  }

  // Install ASAP if available, and also after app creation (module plugins may overwrite $http).
  install()
  nuxtApp.hook('app:created', install)
  nuxtApp.hook('app:mounted', install)
})


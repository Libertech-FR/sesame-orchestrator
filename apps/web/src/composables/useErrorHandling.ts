import { Notify } from "quasar"

type useErrorHandlingReturnType = {
  handleError: (payload: handleErrorPayload) => void
  handleErrorReq: (payload: handleErrorPayload) => void
}

type handleErrorPayload = {
  error: any
  redirect?: boolean
  notify?: boolean
  message?: string
}

export function useErrorHandling(): useErrorHandlingReturnType {
  function handleMfaRequiredIfNeeded(error: any): boolean {
    const statusCode = error?.response?._data?.statusCode || error?.data?.statusCode
    const rawMessage = error?.response?._data?.message || error?.data?.message
    const message = typeof rawMessage === 'string' ? rawMessage.trim() : ''

    if (statusCode !== 403) return false
    if (message.toLowerCase() !== 'mfa required') return false

    Notify.create({
      message: 'Cette action nécessite une validation de sécurité (MFA / mot de passe).',
      color: 'warning',
      position: 'top-right',
      icon: 'mdi-shield-alert-outline',
    })

    return true
  }

  function handleError(payload: handleErrorPayload) {
    const { error, redirect = false, notify = true, message } = payload;
    const msg = message || error.cause.response._data.message || error.cause.response._data.message || 'Une erreur est survenue';
    console.error('handleError', error);
    if (handleMfaRequiredIfNeeded(error)) return
    if (notify) {
      Notify.create({
        message: msg,
        color: 'negative',
        position: 'top-right',
        icon: 'mdi-alert-circle-outline',
      })
    }

    if (redirect) {
      throw createError({
        fatal: true,
        message: msg,
        statusCode: error.cause.response._data.statusCode || error.cause.response._data.statusCode || 500,
      })
    }
  }

  function handleErrorReq(payload: handleErrorPayload) {
    const { error, redirect = false, notify = true, message } = payload
    const msg = message || error.response?._data?.message || error.data?.message || 'Une erreur est survenue'
    console.error('handleErrorReq', error)
    if (handleMfaRequiredIfNeeded(error)) return

    if (notify) {
      Notify.create({
        message: msg,
        color: 'negative',
        position: 'top-right',
        icon: 'mdi-alert-circle-outline',
      })
    }

    if (redirect) {
      throw createError({
        fatal: true,
        message: msg,
        statusCode: error.response?._data?.statusCode || error.data?.statusCode || 500,
      })
    }
  }

  return { handleError, handleErrorReq }
}

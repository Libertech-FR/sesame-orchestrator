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

export function extractErrorMessage(error: any): string | undefined {
  const raw = error?.response?._data?.message ?? error?.data?.message ?? error?.cause?.response?._data?.message ?? error?.message
  if (Array.isArray(raw)) {
    const joined = raw.map((item) => `${item}`.trim()).filter(Boolean).join(', ')
    return joined || undefined
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    return trimmed || undefined
  }
  return undefined
}

/**
 * Recupere la map `validations` d'une reponse API.
 *
 * Selon l'appelant (`$http` direct, `useHttp`/`useAsyncData`, erreur re-emise), la charge utile
 * est accessible via `response._data`, `data`, ou la meme chose sous `cause` : on teste les
 * quatre emplacements, comme le fait deja `extractErrorMessage`.
 */
export function extractValidations(error: any): Record<string, unknown> | undefined {
  const validations =
    error?.response?._data?.validations ??
    error?.data?.validations ??
    error?.cause?.response?._data?.validations ??
    error?.cause?.data?.validations

  return validations && typeof validations === 'object' ? validations : undefined
}

/**
 * Construit un message d'erreur lisible a partir d'une reponse API :
 * le `message` renvoye par l'API, complete des `validations` par champ quand elles existent.
 */
export function formatApiErrorMessage(error: any, fallback: string): string {
  const parts: string[] = []
  const message = extractErrorMessage(error)
  if (message) parts.push(message)

  const validations = extractValidations(error)
  if (validations) {
    for (const [field, detail] of Object.entries(validations)) {
      if (field === 'message') continue
      const text = typeof detail === 'string' ? detail : flattenValidationDetail(detail)
      if (text) parts.push(`${field} : ${text}`)
    }
  }

  return parts.length ? parts.join(' - ') : fallback
}

function flattenValidationDetail(detail: any): string {
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) return detail.map(flattenValidationDetail).filter(Boolean).join(', ')
  if (detail && typeof detail === 'object') {
    return Object.entries(detail)
      .map(([key, value]) => {
        const text = flattenValidationDetail(value)
        return text ? `${key} : ${text}` : ''
      })
      .filter(Boolean)
      .join(', ')
  }
  return ''
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
    const { error, redirect = false, notify = true, message } = payload
    const msg = extractErrorMessage(error) || message || 'Une erreur est survenue'
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
    const msg = extractErrorMessage(error) || message || 'Une erreur est survenue'
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

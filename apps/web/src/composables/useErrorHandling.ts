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
  function handleError(payload: handleErrorPayload) {
    const { error, redirect = false, notify = true, message } = payload;
    const msg = message || error.cause.response._data.message || error.cause.response._data.message || 'Une erreur est survenue';
    console.error('handleError', error);
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

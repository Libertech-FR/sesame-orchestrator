import type { NuxtError } from "nuxt/app";
import type { IFetchError } from "ofetch";
import { Notify } from "quasar";

type useErrorHandlingReturnType = {
    handleError: (payload: handleErrorPayload) => void;
};

type handleErrorPayload = {
    error: any;
    redirect?: boolean;
    notify?: boolean;
    message?: string;
};

//const $q = useQuasar();

export function useErrorHandling(): useErrorHandlingReturnType {
  function handleError(payload: handleErrorPayload) {
  const { error, redirect = false, notify = true, message = 'Une erreur est survenue' } = payload;
  const msg = error.cause.response._data.message || error.cause.response._data.message || message;
  console.error('handleError', error);
  if (notify) {
    Notify.create({
      message: msg,
      color: 'negative',
      position: 'top-right',
      icon: 'mdi-alert-circle-outline',
    });
  }
  if (redirect) {
    throw createError({
      fatal: true,
      message: msg,
      statusCode: error.cause.response._data.statusCode || error.cause.response._data.statusCode || 500,
    });
  }
}
    return { handleError };
}

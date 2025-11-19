import * as Sentry from '@sentry/nuxt'
import { useRuntimeConfig } from '#imports'
import { consola } from 'consola'

const runtimeConfig = useRuntimeConfig()

if (!runtimeConfig.public?.sentry?.dsn) {
  consola.warn('SENTRY DSN not provided, Sentry is disabled')
} else {
  Sentry.init({
    dsn: runtimeConfig.public?.sentry?.dsn,
    release: runtimeConfig.public?.release,
    debug: false,

    sendDefaultPii: true,

    tracesSampleRate: 0.1,
    profilesSampleRate: 0.1,
    profileSessionSampleRate: 0.1,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    includeLocalVariables: true,
    profileLifecycle: 'trace',
    normalizeDepth: 10,
    attachStacktrace: true,

    enableLogs: true,

    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
      Sentry.vueIntegration({
        tracingOptions: {
          trackComponents: true,
          timeout: 500, // milliseconds
        },
      }),
      Sentry.piniaIntegration(usePinia()),
      Sentry.browserTracingIntegration(),
      // Sentry.browserProfilingIntegration(),
      Sentry.consoleLoggingIntegration({ levels: ["log", "warn", "error"] }),
      Sentry.feedbackIntegration({
        id: "sesame-feedback-widget",
        colorScheme: "system",
        showBranding: false,
        autoInject: false,
        useSentryUser: {
          name: "fullName",
          email: "email",
        },
      }),
    ],

    beforeSend(event, hint) {
      if (event.exception && event.event_id) {
        const feedback = Sentry.getFeedback()
        const widget = feedback?.createWidget()

        setTimeout(() => {
          widget?.removeFromDom()
        }, 1 * 60 * 1000) // Remove the widget after 1 minute
        // Sentry.showReportDialog({ eventId: event.event_id })
      }
      return event
    },
  })
  consola.debug(`Sentry initialized successfully`)
}

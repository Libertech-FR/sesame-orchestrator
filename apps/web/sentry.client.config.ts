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

    tracesSampleRate: 1.0,
    profilesSampleRate: 1.0,
    profileSessionSampleRate: 1.0,
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
        const feedback = Sentry.getFeedback();
        feedback?.createWidget();
        // Sentry.showReportDialog({ eventId: event.event_id })
      }
      return event
    },
  })
  consola.debug(`Sentry initialized successfully`)
}

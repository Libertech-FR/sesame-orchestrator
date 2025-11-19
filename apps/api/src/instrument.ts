import { Logger } from '@nestjs/common'
import * as Sentry from '@sentry/nestjs'
import { nodeProfilingIntegration } from '@sentry/profiling-node'

if (!process.env.SESAME_SENTRY_DSN) {
  Logger.warn('SENTRY DSN not provided, Sentry is disabled', 'SentryInit')
} else {
  Sentry.init({
    dsn: process.env.SESAME_SENTRY_DSN!,
    release: process.env.npm_package_name + '@' + process.env.npm_package_version,
    debug: false,

    sendDefaultPii: true,
    tracesSampleRate: 0.1,
    profilesSampleRate: 0.1,
    includeLocalVariables: true,
    profileSessionSampleRate: 0.1,
    profileLifecycle: 'trace',
    normalizeDepth: 10,
    attachStacktrace: true,

    enableLogs: true,

    integrations: [
      nodeProfilingIntegration(),

      Sentry.mongooseIntegration(),
      Sentry.consoleIntegration(),
      Sentry.httpIntegration(),
      Sentry.expressIntegration(),
      Sentry.nestIntegration(),
      Sentry.redisIntegration(),
      Sentry.fsIntegration(),
    ],
  })
  Logger.log(`Sentry initialized successfully`, 'SentryInit')
}

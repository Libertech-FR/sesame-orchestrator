import { Logger } from '@nestjs/common'
import * as Sentry from '@sentry/nestjs'

if (!process.env.SESAME_SENTRY_DSN) {
  Logger.warn('SENTRY DSN not provided, Sentry is disabled', 'SentryInit')
} else {
  Sentry.init({
    dsn: process.env.SESAME_SENTRY_DSN!,
    debug: false,

    sendDefaultPii: true,
    tracesSampleRate: 1.0,
    includeLocalVariables: true,

    integrations: [
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

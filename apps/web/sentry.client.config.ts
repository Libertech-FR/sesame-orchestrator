import * as Sentry from '@sentry/nuxt'
Sentry.init({
  dsn: process.env.SESAME_SENTRY_DSN!,
  sendDefaultPii: true,
});

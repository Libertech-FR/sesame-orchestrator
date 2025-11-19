import * as Sentry from '@sentry/nuxt'
import { useRuntimeConfig } from '#imports'

const runtimeConfig = useRuntimeConfig()

Sentry.init({
  // Prefer the Nuxt runtime config for client-side DSN access
  dsn: runtimeConfig.public?.sentry?.dsn,

  // Attach basic user context (IP/headers) when available
  sendDefaultPii: true,

  // Performance: capture a sample of transactions (adjust in production)
  tracesSampleRate: 1.0,

  // Session Replay: capture 10% of sessions and 100% on error
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Browser Console logs to Sentry (verbose in dev only)
  enableLogs: process.env.NODE_ENV === 'development',

  // Enable Replay
  integrations: [Sentry.replayIntegration()],
})

console.log('Sentry client initialized with DSN:', runtimeConfig.public?.sentry?.dsn)

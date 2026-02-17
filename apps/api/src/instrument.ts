import { Logger } from '@nestjs/common'
import * as Sentry from '@sentry/nestjs'
import { nodeProfilingIntegration } from '@sentry/profiling-node'

/**
 * Initialisation conditionnelle de Sentry
 *
 * @description Vérifie la présence du DSN Sentry dans les variables d'environnement
 * et initialise Sentry avec les configurations suivantes :
 * - Taux d'échantillonnage des traces : 10%
 * - Taux d'échantillonnage des profils : 10%
 * - Capture des informations personnelles (PII)
 * - Intégrations : Mongoose, Console, HTTP, Express, NestJS, Redis, FS
 * - Profiling Node.js activé
 *
 * Si SESAME_SENTRY_DSN n'est pas défini, Sentry reste désactivé et un avertissement est émis.
 */
if (!process.env.SESAME_SENTRY_DSN) {
  Logger.warn('SENTRY DSN not provided, Sentry is disabled', Sentry.constructor.name)
} else {
  Sentry.init({
    /** DSN de connexion à Sentry */
    dsn: process.env.SESAME_SENTRY_DSN!,
    /** Version de release au format nom@version */
    release: process.env.npm_package_name + '@' + process.env.npm_package_version,
    /** Mode debug désactivé en production */
    debug: false,

    /** Envoi des données personnellement identifiables */
    sendDefaultPii: true,
    /** Taux d'échantillonnage pour les traces (10%) */
    tracesSampleRate: 0.1,
    /** Taux d'échantillonnage pour les profils (10%) */
    profilesSampleRate: 0.1,
    /** Inclusion des variables locales dans les rapports d'erreur */
    includeLocalVariables: true,
    /** Taux d'échantillonnage pour les sessions de profil (10%) */
    profileSessionSampleRate: 0.1,
    /** Cycle de vie du profiling basé sur les traces */
    profileLifecycle: 'trace',
    /** Profondeur de normalisation des objets */
    normalizeDepth: 10,
    /** Attachement des stack traces aux événements */
    attachStacktrace: true,

    /** Activation de la capture des logs */
    enableLogs: true,

    /**
     * Intégrations Sentry activées
     * @description Liste des intégrations pour capturer différents types d'événements
     * et erreurs provenant de diverses sources (Mongoose, HTTP, Redis, etc.)
     */
    integrations: [
      /** Profiling Node.js pour analyse des performances */
      nodeProfilingIntegration() as any,
      /** Intégration Mongoose pour les erreurs de base de données */
      Sentry.mongooseIntegration(),
      /** Intégration Console pour capturer console.error/warn */
      Sentry.consoleIntegration(),
      /** Intégration HTTP pour tracer les requêtes sortantes */
      Sentry.httpIntegration(),
      /** Intégration Express pour les requêtes entrantes */
      Sentry.expressIntegration(),
      /** Intégration NestJS pour le framework */
      Sentry.nestIntegration(),
      /** Intégration Redis pour les opérations de cache */
      Sentry.redisIntegration(),
      /** Intégration FS pour les opérations système de fichiers */
      Sentry.fsIntegration(),
    ],
  })
  Logger.log(`Sentry initialized successfully`, Sentry.constructor.name)
}

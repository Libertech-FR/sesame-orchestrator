import { Module } from '@nestjs/common'
import { TerminusModule } from '@nestjs/terminus'
import { HttpModule } from '@nestjs/axios'
import { HealthController } from './health.controller'

/**
 * Module de vérification de l'état de santé du système.
 *
 * Ce module configure et expose les endpoints de health check permettant de surveiller
 * l'état de santé de l'application, de ses dépendances et de ses ressources système.
 * Il utilise NestJS Terminus pour fournir des indicateurs standardisés de santé.
 *
 * @module HealthModule
 *
 * @description
 * Le module configure :
 * - **TerminusModule** : Framework de health check de NestJS avec affichage formaté des erreurs
 * - **HttpModule** : Module HTTP pour les vérifications de connectivité externe
 * - **HealthController** : Contrôleur exposant les endpoints de health check
 *
 * Fonctionnalités de monitoring :
 * - Vérification de la connectivité à la base de données MongoDB
 * - Vérification de la connectivité réseau externe
 * - Surveillance de l'utilisation du disque
 * - Surveillance de la consommation mémoire (heap et RSS)
 *
 * Utilisation :
 * - Les endpoints sont publics (pas d'authentification) pour permettre le monitoring externe
 * - Compatibles avec les systèmes de monitoring comme Kubernetes liveness/readiness probes
 * - Format de réponse standardisé compatible avec les outils de monitoring
 */
@Module({
  imports: [
    TerminusModule.forRoot({
      errorLogStyle: 'pretty',
    }),
    HttpModule,
  ],
  controllers: [HealthController],
})
export class HealthModule { }

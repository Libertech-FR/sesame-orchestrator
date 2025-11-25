import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { AuditsSchema, Audits } from '~/core/audits/_schemas/audits.schema'
import { AuditsService } from './audits.service'
import { AuditsController } from './audits.controller'

/**
 * Module de gestion des audits et de l'historique des enregistrements.
 *
 * Ce module fournit un système de logging en base de données où l'enregistrement
 * automatique de l'historique des modifications est géré par un plugin Mongoose.
 * Le module expose des fonctionnalités pour lister, restaurer et supprimer les
 * entrées d'audit capturées automatiquement.
 *
 * @module AuditsModule
 *
 * @description
 * Architecture du système :
 * - **Plugin Mongoose** : Intercepte automatiquement toutes les opérations de base de données
 *   (création, mise à jour, suppression) et enregistre les traces d'audit avec l'état
 *   complet avant/après modification
 * - **Service AuditsService** : Permet de lister, restaurer et supprimer les entrées d'audit
 * - **Contrôleur AuditsController** : Expose les endpoints API REST pour consulter l'historique
 *   et effectuer des opérations de restauration
 *
 * Fonctionnalités principales :
 * - Enregistrement automatique de l'historique via plugin Mongoose (transparent)
 * - Consultation de l'historique complet des modifications d'un enregistrement
 * - Restauration (rollback) d'une version antérieure d'un enregistrement
 * - Suppression d'entrées d'audit obsolètes ou non nécessaires
 * - Traçabilité complète des actions effectuées avec métadonnées
 *
 * Le module configure :
 * - La connexion à la base de données MongoDB via Mongoose pour le modèle Audits
 * - Le service AuditsService pour les opérations de consultation, restauration et suppression
 * - Le contrôleur AuditsController pour les endpoints API REST
 *
 * @exports AuditsService - Expose le service pour être utilisé par d'autres modules
 */
@Module({
  imports: [
    MongooseModule.forFeatureAsync([
      {
        name: Audits.name,
        useFactory: () => AuditsSchema,
      },
    ]),
  ],
  providers: [AuditsService],
  controllers: [AuditsController],
  exports: [AuditsService],
})
export class AuditsModule { }

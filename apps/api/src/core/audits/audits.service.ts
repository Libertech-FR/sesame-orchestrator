import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Audits } from '~/core/audits/_schemas/audits.schema'
import { Model } from 'mongoose'
import { AbstractServiceSchema } from '~/_common/abstracts/abstract.service.schema'

/**
 * Service de gestion des audits et de l'historique des enregistrements.
 *
 * Ce service permet de consulter, restaurer et supprimer les entrées d'audit
 * qui sont automatiquement enregistrées en base de données par un plugin Mongoose.
 * Le plugin capture automatiquement toutes les modifications (création, mise à jour,
 * suppression) et enregistre l'état complet avant/après modification.
 *
 * @class AuditsService
 * @extends {AbstractServiceSchema}
 *
 * @description
 * Fonctionnalités du service :
 * - **Lister** : Consulter l'historique complet des modifications d'un enregistrement
 * - **Restaurer** : Effectuer un rollback en restaurant une version antérieure d'un enregistrement
 * - **Supprimer** : Nettoyer les entrées d'audit obsolètes ou non nécessaires
 *
 * Note : L'enregistrement automatique des audits est géré par un plugin Mongoose
 * qui intercepte les opérations de base de données et crée les traces d'audit
 * de manière transparente.
 */
@Injectable()
export class AuditsService extends AbstractServiceSchema {
  /**
   * Constructeur du service AuditsService.
   *
   * @param {Model<Audits>} _model - Le modèle Mongoose pour la collection des audits
   */
  constructor(@InjectModel(Audits.name) protected _model: Model<Audits>) {
    super()
  }
}

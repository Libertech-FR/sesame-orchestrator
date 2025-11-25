import { Controller } from '@nestjs/common'
import { AbstractController } from '~/_common/abstracts/abstract.controller'
import { ApiTags } from '@nestjs/swagger'
import { PartialProjectionType } from '~/_common/types/partial-projection.type'
import { AuditsService } from '~/core/audits/audits.service'

/**
 * Contrôleur pour la gestion des audits et de l'historique des enregistrements.
 *
 * Ce contrôleur expose les endpoints API REST permettant de consulter l'historique
 * des modifications enregistrées automatiquement par le plugin Mongoose, ainsi que
 * d'effectuer des opérations de restauration et de suppression d'entrées d'audit.
 *
 * @class AuditsController
 * @extends {AbstractController}
 *
 * Cas d'usage typiques :
 * - Consulter l'historique complet des modifications d'un enregistrement
 * - Auditer les actions effectuées par les utilisateurs
 * - Effectuer un rollback pour restaurer une version antérieure
 * - Nettoyer les audits obsolètes pour optimiser l'espace de stockage
 */
@ApiTags('core/audits')
@Controller('audits')
export class AuditsController extends AbstractController {
  /**
   * Configuration de la projection pour limiter les champs retournés.
   * Par défaut, tous les champs sont retournés (projection vide).
   */
  protected static readonly projection: PartialProjectionType<any> = {}

  /**
   * Constructeur du contrôleur AuditsController.
   *
   * @param {AuditsService} _service - Le service de gestion des audits
   */
  public constructor(private readonly _service: AuditsService) {
    super()
  }
}

import { Injectable } from '@nestjs/common'
import { AbstractService } from '~/_common/abstracts/abstract.service'

/**
 * Service principal du module Core.
 *
 * Ce service fournit la logique métier transversale pour le module Core.
 * Il peut contenir des fonctionnalités communes à plusieurs sous-modules
 * ou des opérations qui nécessitent la coordination de plusieurs services.
 *
 * @class CoreService
 * @extends {AbstractService}
 */
@Injectable()
export class CoreService extends AbstractService {
  /**
   * Constructeur du service CoreService.
   *
   * @constructor
   */
  public constructor() {
    super()
  }
}

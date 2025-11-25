import { Controller } from '@nestjs/common'
import { CoreService } from './core.service'
import { ApiTags } from '@nestjs/swagger'

/**
 * Contrôleur principal du module Core.
 *
 * Ce contrôleur sert de point d'entrée pour les endpoints API du module Core.
 * Le module Core regroupe les fonctionnalités essentielles du système telles que
 * la gestion des agents, des audits, de l'authentification, des backends, etc.
 *
 * @class CoreController
 *
 * @description
 * Le contrôleur Core peut exposer des endpoints globaux ou transversaux qui ne
 * relèvent pas d'un sous-module spécifique. Les fonctionnalités métier sont
 * généralement déléguées aux sous-contrôleurs spécialisés :
 * - AgentsController : Gestion des agents
 * - AuditsController : Consultation des audits
 * - AuthController : Authentification et autorisation
 * - BackendsController : Gestion des backends
 * - etc.
 *
 * Ce contrôleur reste disponible pour des opérations générales au niveau du module Core
 * ou pour servir de facade à des fonctionnalités transversales.
 */
@ApiTags('core')
@Controller('core')
export class CoreController {
  /**
   * Constructeur du contrôleur CoreController.
   * 
   * @param {CoreService} _service - Le service Core pour la logique métier
   */
  public constructor(private readonly _service: CoreService) { }
}

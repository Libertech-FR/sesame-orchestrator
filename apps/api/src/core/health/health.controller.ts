
import { Controller, Get } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { HealthCheckService, HttpHealthIndicator, HealthCheck, DiskHealthIndicator, MemoryHealthIndicator, MongooseHealthIndicator, HealthCheckResult } from '@nestjs/terminus'
import { Public } from '~/_common/decorators/public.decorator'

/**
 * Multiplicateur pour convertir les octets en mégaoctets.
 * @constant {number}
 */
const MEMORY_MULTIPLIER = 1024 * 1024

/**
 * Contrôleur pour la vérification de l'état de santé du système.
 *
 * Ce contrôleur expose des endpoints de health check permettant de surveiller
 * l'état de santé de l'application et de ses dépendances. Il utilise NestJS Terminus
 * pour vérifier différents indicateurs de santé.
 *
 * @class HealthController
 *
 * @description
 * Indicateurs de santé vérifiés :
 * - **Mongoose** : Connectivité à la base de données MongoDB
 * - **HTTP** : Connectivité réseau externe (test avec GitHub)
 * - **Disk** : Utilisation du disque (seuil à 95%)
 * - **Memory Heap** : Utilisation de la mémoire heap (seuil à 512 MB)
 * - **Memory RSS** : Utilisation de la mémoire RSS (seuil à 512 MB)
 *
 * Le endpoint est public (pas d'authentification requise) pour permettre
 * aux systèmes de monitoring externes de vérifier l'état du service.
 */
@Public()
@ApiTags('core/health')
@Controller('health')
export class HealthController {
  /**
   * Constructeur du contrôleur HealthController.
   *
   * @param {HealthCheckService} health - Service de vérification de santé
   * @param {MongooseHealthIndicator} mongoose - Indicateur de santé MongoDB
   * @param {HttpHealthIndicator} http - Indicateur de santé HTTP
   * @param {DiskHealthIndicator} disk - Indicateur de santé du disque
   * @param {MemoryHealthIndicator} memory - Indicateur de santé de la mémoire
   */
  public constructor(
    private readonly health: HealthCheckService,

    private readonly mongoose: MongooseHealthIndicator,
    private readonly http: HttpHealthIndicator,
    private readonly disk: DiskHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
  ) { }

  /**
   * Endpoint de vérification de l'état de santé du système.
   *
   * Exécute une série de vérifications pour déterminer si l'application
   * et ses dépendances sont opérationnelles. Retourne un statut global
   * ainsi que le détail de chaque indicateur.
   *
   * @returns {Promise<HealthCheckResult>} Résultat complet du health check
   */
  @Get()
  @HealthCheck()
  public async check(): Promise<HealthCheckResult> {
    return await this.health.check([
      () => this.mongoose.pingCheck('mongoose'),

      () => this.http.pingCheck('http-github', 'https://github.com'),

      // DISK en GB
      () => this.disk.checkStorage('storage', {
        path: '/',
        thresholdPercent: 0.95,
      }),

      // MB pour heap et RSS
      () => this.memory.checkHeap('memory_heap', 512 * MEMORY_MULTIPLIER),
      () => this.memory.checkRSS('memory_rss', 512 * MEMORY_MULTIPLIER),
    ])
  }
}

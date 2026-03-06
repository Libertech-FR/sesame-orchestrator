import { Controller, Get } from '@nestjs/common'
import { statfs } from 'fs/promises'
import { cpus, loadavg, totalmem } from 'os'
import { ApiTags } from '@nestjs/swagger'
import { DiskHealthIndicator, HealthCheck, HealthCheckError, HealthCheckResult, HealthCheckService, HttpHealthIndicator, MemoryHealthIndicator, MongooseHealthIndicator } from '@nestjs/terminus'
import { Public } from '~/_common/decorators/public.decorator'

/**
 * Multiplicateur pour convertir les octets en mégaoctets.
 * @constant {number}
 */
const MEMORY_MULTIPLIER = 1024 * 1024
const GIGABYTE_MULTIPLIER = 1024 * 1024 * 1024
const CPU_LOAD_THRESHOLD = 0.85
const DISK_THRESHOLD_PERCENT = 0.95
const HEAP_MEMORY_THRESHOLD_MB = 512
const RSS_MEMORY_THRESHOLD_MB = 512

type HealthResponse = HealthCheckResult & {
  system: {
    memory: {
      heapUsedMb: number
      heapTotalMb: number
      rssMb: number
      totalSystemMemoryMb: number
    }
    cpu: {
      load1mPerCore: number
      load5mPerCore: number
      load15mPerCore: number
      cores: number
      threshold: number
    }
  }
  futureChecks: {
    externalExposure: {
      enabled: boolean
      status: 'not_configured'
      note: string
    }
    leakedPasswords: {
      enabled: boolean
      status: 'not_implemented'
      note: string
    }
  }
}

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
   * @returns {Promise<HealthResponse>} Résultat complet du health check enrichi
   */
  @Get()
  @HealthCheck()
  public async check(): Promise<HealthResponse> {
    const healthResult = await this.health.check([
      () => this.checkMongoose(),

      () => this.http.pingCheck('http-github', 'https://github.com'),

      () => this.checkStorage(),

      () => this.checkMemoryHeap(),
      () => this.checkMemoryRss(),
      () => this.checkCpu(),
    ])

    const memoryUsage = process.memoryUsage()
    const cpuCount = Math.max(cpus().length, 1)
    const [load1m, load5m, load15m] = loadavg()

    return {
      ...healthResult,
      system: {
        memory: {
          heapUsedMb: Number((memoryUsage.heapUsed / MEMORY_MULTIPLIER).toFixed(2)),
          heapTotalMb: Number((memoryUsage.heapTotal / MEMORY_MULTIPLIER).toFixed(2)),
          rssMb: Number((memoryUsage.rss / MEMORY_MULTIPLIER).toFixed(2)),
          totalSystemMemoryMb: Number((totalmem() / MEMORY_MULTIPLIER).toFixed(2)),
        },
        cpu: {
          load1mPerCore: Number((load1m / cpuCount).toFixed(3)),
          load5mPerCore: Number((load5m / cpuCount).toFixed(3)),
          load15mPerCore: Number((load15m / cpuCount).toFixed(3)),
          cores: cpuCount,
          threshold: CPU_LOAD_THRESHOLD,
        },
      },
      futureChecks: {
        externalExposure: {
          enabled: false,
          status: 'not_configured',
          note: 'Reserved for a future check against a configured public URL (ex: APP_PUBLIC_URL).',
        },
        leakedPasswords: {
          enabled: false,
          status: 'not_implemented',
          note: 'Reserved for future leaked-password detection integration (k-anonymity/HIBP style).',
        },
      },
    }
  }

  private checkCpu(): Record<string, { status: 'up' | 'down'; load1mPerCore: number; threshold: number; cores: number }> {
    const cpuCount = Math.max(cpus().length, 1)
    const perCoreLoad = loadavg()[0] / cpuCount
    const indicator = {
      status: perCoreLoad <= CPU_LOAD_THRESHOLD ? 'up' : 'down',
      load1mPerCore: Number(perCoreLoad.toFixed(3)),
      threshold: CPU_LOAD_THRESHOLD,
      cores: cpuCount,
    } as const

    if (indicator.status === 'down') {
      throw new HealthCheckError('cpu_check_failed', { cpu: indicator })
    }

    return { cpu: indicator }
  }

  private async checkMongoose(): Promise<Record<string, { status: 'up' | 'down'; pingMs: number }>> {
    const start = Date.now()

    try {
      await this.mongoose.pingCheck('mongoose')
      return {
        mongoose: {
          status: 'up',
          pingMs: Date.now() - start,
        },
      }
    } catch {
      throw new HealthCheckError('mongoose_check_failed', {
        mongoose: {
          status: 'down',
          pingMs: Date.now() - start,
        },
      })
    }
  }

  private async checkStorage(): Promise<Record<string, { status: 'up' | 'down'; usedPercent: number; thresholdPercent: number; totalGb: number; usedGb: number; freeGb: number }>> {
    await this.disk.checkStorage('storage', {
      path: '/',
      thresholdPercent: DISK_THRESHOLD_PERCENT,
    })

    const fsStats = await statfs('/')
    const totalBytes = fsStats.blocks * fsStats.bsize
    const freeBytes = fsStats.bavail * fsStats.bsize
    const usedBytes = Math.max(totalBytes - freeBytes, 0)
    const usedPercent = totalBytes > 0 ? usedBytes / totalBytes : 0

    const indicator = {
      status: usedPercent <= DISK_THRESHOLD_PERCENT ? 'up' : 'down',
      usedPercent: Number((usedPercent * 100).toFixed(2)),
      thresholdPercent: Number((DISK_THRESHOLD_PERCENT * 100).toFixed(2)),
      totalGb: Number((totalBytes / GIGABYTE_MULTIPLIER).toFixed(2)),
      usedGb: Number((usedBytes / GIGABYTE_MULTIPLIER).toFixed(2)),
      freeGb: Number((freeBytes / GIGABYTE_MULTIPLIER).toFixed(2)),
    } as const

    if (indicator.status === 'down') {
      throw new HealthCheckError('storage_check_failed', { storage: indicator })
    }

    return { storage: indicator }
  }

  private async checkMemoryHeap(): Promise<Record<string, { status: 'up' | 'down'; usedMb: number; thresholdMb: number; usedPercent: number }>> {
    await this.memory.checkHeap('memory_heap', HEAP_MEMORY_THRESHOLD_MB * MEMORY_MULTIPLIER)
    const heapUsedMb = process.memoryUsage().heapUsed / MEMORY_MULTIPLIER
    const usedPercent = heapUsedMb / HEAP_MEMORY_THRESHOLD_MB

    const indicator = {
      status: heapUsedMb <= HEAP_MEMORY_THRESHOLD_MB ? 'up' : 'down',
      usedMb: Number(heapUsedMb.toFixed(2)),
      thresholdMb: HEAP_MEMORY_THRESHOLD_MB,
      usedPercent: Number((usedPercent * 100).toFixed(2)),
    } as const

    if (indicator.status === 'down') {
      throw new HealthCheckError('memory_heap_check_failed', { memory_heap: indicator })
    }

    return { memory_heap: indicator }
  }

  private async checkMemoryRss(): Promise<Record<string, { status: 'up' | 'down'; usedMb: number; thresholdMb: number; usedPercent: number }>> {
    await this.memory.checkRSS('memory_rss', RSS_MEMORY_THRESHOLD_MB * MEMORY_MULTIPLIER)
    const rssMb = process.memoryUsage().rss / MEMORY_MULTIPLIER
    const usedPercent = rssMb / RSS_MEMORY_THRESHOLD_MB

    const indicator = {
      status: rssMb <= RSS_MEMORY_THRESHOLD_MB ? 'up' : 'down',
      usedMb: Number(rssMb.toFixed(2)),
      thresholdMb: RSS_MEMORY_THRESHOLD_MB,
      usedPercent: Number((usedPercent * 100).toFixed(2)),
    } as const

    if (indicator.status === 'down') {
      throw new HealthCheckError('memory_rss_check_failed', { memory_rss: indicator })
    }

    return { memory_rss: indicator }
  }
}

import { Controller, Get, Header, Res, Sse } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { HealthCheck } from '@nestjs/terminus'
import { Response } from 'express'
import { Observable } from 'rxjs'
import { Public } from '~/_common/decorators/public.decorator'
import { HealthHistoryService, HealthHistorySnapshot } from './health-history.service'
import { HealthSnapshotPayload, HealthSnapshotService } from './health-snapshot.service'

const DEFAULT_HEALTH_SSE_INTERVAL_MS = 15_000
const parsedHealthSseIntervalMs = Number.parseInt(`${process.env.SESAME_HEALTH_SSE_INTERVAL_MS || ''}`, 10)
const HEALTH_SSE_INTERVAL_MS = Number.isFinite(parsedHealthSseIntervalMs) && parsedHealthSseIntervalMs > 0
  ? parsedHealthSseIntervalMs
  : DEFAULT_HEALTH_SSE_INTERVAL_MS

type HealthResponse = HealthSnapshotPayload & {
  history: HealthHistorySnapshot[]
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
  public constructor(
    private readonly healthSnapshotService: HealthSnapshotService,
    private readonly healthHistoryService: HealthHistoryService,
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
    return this.buildHealthResponseFromStoredHistory('adaptive')
  }

  @Sse('sse')
  @Header('Cache-Control', 'no-cache, no-transform')
  @Header('Connection', 'keep-alive')
  public sse(@Res() res: Response): Observable<MessageEvent> {
    res.setTimeout(0)
    res.socket.setKeepAlive?.(true)

    return new Observable((observer) => {
      const emitHealthPayload = async () => {
        try {
          const payload = await this.buildHealthResponseFromStoredHistory('live')
          observer.next({
            data: payload,
          } as MessageEvent)
        } catch {
          observer.next({
            data: { type: 'error', message: 'health_sse_emit_failed' },
          } as MessageEvent)
        }
      }

      observer.next({ retry: 10_000 } as unknown as MessageEvent)
      emitHealthPayload()

      const heartbeat = setInterval(() => {
        observer.next({ type: 'ping', data: 'keepalive' } as MessageEvent)
      }, 15_000)
      const interval = setInterval(emitHealthPayload, HEALTH_SSE_INTERVAL_MS)

      const cleanup = () => {
        clearInterval(interval)
        clearInterval(heartbeat)
        try { observer.complete?.() } catch { }
      }

      res.on('close', cleanup)
      return cleanup
    })
  }

  private async buildHealthResponseFromStoredHistory(mode: 'live' | 'adaptive'): Promise<HealthResponse> {
    let latestSnapshot = await this.healthHistoryService.getLatestRawSnapshot()

    if (!latestSnapshot) {
      const freshSnapshot = await this.healthSnapshotService.collectSnapshot()
      await this.healthHistoryService.appendSnapshot({
        status: freshSnapshot.status === 'error' ? 'down' : freshSnapshot.status || 'unknown',
        details: freshSnapshot.details || {},
        system: freshSnapshot.system || {},
        futureChecks: freshSnapshot.futureChecks || {},
      })
      latestSnapshot = await this.healthHistoryService.getLatestRawSnapshot()

      if (!latestSnapshot) {
        return {
          ...freshSnapshot,
          history: [],
        }
      }
    }

    const history = mode === 'live'
      ? await this.healthHistoryService.getLiveHistory()
      : await this.healthHistoryService.getAdaptiveHistory()
    return {
      status: latestSnapshot.status || 'unknown',
      details: latestSnapshot.details || {},
      system: latestSnapshot.system || {},
      futureChecks: latestSnapshot.futureChecks || {},
      history,
    } as HealthResponse
  }
}

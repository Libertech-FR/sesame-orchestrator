import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common'
import { Observable } from 'rxjs'
import { LifecycleCrudService } from '../lifecycle-crud.service'
import { LifecycleHooksService } from '../lifecycle-hooks.service'

/**
 * Intercepteur qui garantit que les caches lifecycle (états + règles) sont frais
 * avec une politique LRU/TTL avant chaque appel aux routes du contrôleur.
 */
@Injectable()
export class LifecycleCacheInterceptor implements NestInterceptor {
  constructor(
    private readonly crudService: LifecycleCrudService,
    private readonly hooksService: LifecycleHooksService,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    // TTL par défaut: 60 secondes; ajustable ici ou via config si besoin
    const ttlMs = 60_000

    // Rafraîchit le cache des états (CRUD) si nécessaire
    await this.crudService.ensureStatesCacheFresh(ttlMs)

    // Rafraîchit le cache des règles+états (hooks) si nécessaire
    await this.hooksService.ensureLifecycleCacheFresh(ttlMs)

    return next.handle()
  }
}

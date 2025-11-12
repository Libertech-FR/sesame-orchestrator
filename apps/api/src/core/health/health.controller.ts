
import { Controller, Get } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { HealthCheckService, HttpHealthIndicator, HealthCheck, DiskHealthIndicator, MemoryHealthIndicator, MongooseHealthIndicator, HealthCheckResult } from '@nestjs/terminus'
import { Public } from '~/_common/decorators/public.decorator'

const MEMORY_MULTIPLIER = 1024 * 1024
const DISK_MULTIPLIER = 1024 * 1024 * 1024

@Public()
@ApiTags('core/health')
@Controller('health')
export class HealthController {
  public constructor(
    private readonly health: HealthCheckService,

    private readonly mongoose: MongooseHealthIndicator,
    private readonly http: HttpHealthIndicator,
    private readonly disk: DiskHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
  ) { }

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

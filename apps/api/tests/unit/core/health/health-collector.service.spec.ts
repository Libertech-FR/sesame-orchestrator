import { Logger } from '@nestjs/common'
import { HealthCollectorService } from '~/core/health/health-collector.service'

describe('HealthCollectorService', () => {
  const collectSnapshot = jest.fn()
  const appendSnapshot = jest.fn()

  const healthSnapshotService = { collectSnapshot }
  const healthHistoryService = { appendSnapshot }

  let service: HealthCollectorService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new HealthCollectorService(healthSnapshotService as any, healthHistoryService as any)
  })

  it('should collect and store snapshot on module init', async () => {
    const collectSpy = jest.spyOn(service, 'collectAndStoreSnapshot').mockResolvedValue(undefined)

    await service.onModuleInit()

    expect(collectSpy).toHaveBeenCalledTimes(1)
  })

  it('should map error status to down before persisting history', async () => {
    collectSnapshot.mockResolvedValue({
      status: 'error',
      details: { db: { status: 'down' } },
      system: { memory: {} },
      futureChecks: { leakedPasswords: { enabled: false } },
    })
    appendSnapshot.mockResolvedValue(undefined)

    await service.collectAndStoreSnapshot()

    expect(appendSnapshot).toHaveBeenCalledWith({
      status: 'down',
      details: { db: { status: 'down' } },
      system: { memory: {} },
      futureChecks: { leakedPasswords: { enabled: false } },
    })
  })

  it('should not throw when collection fails', async () => {
    collectSnapshot.mockRejectedValue(new Error('boom'))
    const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined)

    await expect(service.collectAndStoreSnapshot()).resolves.toBeUndefined()
    expect(warnSpy).toHaveBeenCalled()

    warnSpy.mockRestore()
  })
})

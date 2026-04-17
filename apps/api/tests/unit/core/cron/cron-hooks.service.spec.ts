import { CronHooksService } from '~/core/cron/cron-hooks.service'

describe('CronHooksService', () => {
  const configService = {
    get: jest.fn().mockReturnValue('0 * * * *'),
  }
  const schedulerRegistry = {}

  let service: CronHooksService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new CronHooksService(configService as any, schedulerRegistry as any)
  })

  it('should return busy when another manual run is in progress', async () => {
    ;(service as any).manualRunInProgress = true
    ;(service as any).manualRunTaskName = 'existing-task'

    const result = await service.runTaskNow('new-task')

    expect(result).toBe('busy')
  })

  it('should return not_found when task does not exist even after refresh', async () => {
    ;(service as any).cronTasks = []
    const refreshSpy = jest.spyOn(service as any, 'refreshCronTasksFileCache').mockResolvedValue([])

    const result = await service.runTaskNow('missing-task')

    expect(refreshSpy).toHaveBeenCalledTimes(1)
    expect(result).toBe('not_found')
  })

  it('should start manual run when task exists', async () => {
    ;(service as any).cronTasks = [
      {
        name: 'task-1',
        description: 'Task 1',
        enabled: true,
        schedule: '* * * * *',
        handler: 'identities-password-expiration-reminder-send',
        options: { limit: 10 },
      },
    ]

    const executeSpy = jest.spyOn(service as any, 'executeHandlerCommand').mockResolvedValue(undefined)

    const result = await service.runTaskNow('task-1')

    expect(result).toBe('started')
    expect(executeSpy).toHaveBeenCalledWith(
      'task-1',
      'identities-password-expiration-reminder-send',
      { limit: 10 },
    )
  })
})

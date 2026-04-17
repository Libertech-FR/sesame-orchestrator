import { CronService } from '~/core/cron/cron.service'

describe('CronService', () => {
  const getCronTasks = jest.fn()
  const syncCronJobs = jest.fn()
  const runTaskNow = jest.fn()
  const getCronJob = jest.fn()

  const cronHooksService = {
    getCronTasks,
    syncCronJobs,
    runTaskNow,
  }
  const schedulerRegistry = {
    getCronJob,
  }
  const configService = {
    get: jest.fn(),
  }

  let service: CronService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new CronService(schedulerRegistry as any, cronHooksService as any, configService as any)
  })

  it('should search tasks with pagination and total', async () => {
    getCronTasks.mockReturnValue([
      { name: 'task-1', description: 'first task', enabled: false, schedule: '* * * * *', handler: 'h1' },
      { name: 'task-2', description: 'second task', enabled: false, schedule: '* * * * *', handler: 'h2' },
    ])

    const [data, total] = await service.search('task', { page: 1, limit: 1 })

    expect(total).toBe(2)
    expect(data).toHaveLength(1)
    expect(data[0].name).toBe('task-1')
  })

  it('should return null when reading unknown task', async () => {
    getCronTasks.mockReturnValue([{ name: 'task-1', description: '', enabled: false, schedule: '', handler: '' }])

    const result = await service.read('missing')

    expect(result).toBeNull()
  })

  it('should delegate runImmediately and return not_found when task does not exist', async () => {
    getCronTasks.mockReturnValue([])
    const readSpy = jest.spyOn(service, 'read')
    readSpy.mockResolvedValueOnce(null as any)

    const result = await service.runImmediately('missing')

    expect(result).toBe('not_found')
    expect(runTaskNow).not.toHaveBeenCalled()
  })

  it('should delegate runImmediately to cronHooksService when task exists', async () => {
    const readSpy = jest.spyOn(service, 'read')
    readSpy.mockResolvedValueOnce({ name: 'task-1' } as any)
    runTaskNow.mockResolvedValue('started')

    const result = await service.runImmediately('task-1')

    expect(runTaskNow).toHaveBeenCalledWith('task-1')
    expect(result).toBe('started')
  })

  it('should read enabled task with _job details when scheduler has job', async () => {
    getCronTasks.mockReturnValue([
      { name: 'task-1', description: 'desc', enabled: true, schedule: '* * * * *', handler: 'h1' },
    ])
    getCronJob.mockReturnValue({
      lastDate: () => ({ toISOString: () => '2026-01-01T00:00:00.000Z' }),
      nextDate: () => ({ toJSDate: () => new Date('2026-01-01T01:00:00.000Z') }),
      isActive: true,
      isCallbackRunning: false,
      name: 'cron-task-task-1',
      threshold: 0,
      unrefTimeout: false,
      runOnce: false,
      waitForCompletion: false,
    })

    const result = await service.read('task-1')

    expect(result).toBeDefined()
    expect(result?._job).toBeDefined()
    expect(result?._job?.isActive).toBe(true)
  })
})

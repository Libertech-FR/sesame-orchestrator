import { ConflictException, NotFoundException } from '@nestjs/common'
import { CronController } from '~/core/cron/cron.controller'

describe('CronController', () => {
  const search = jest.fn()
  const read = jest.fn()
  const readLogs = jest.fn()
  const setEnabled = jest.fn()
  const runImmediately = jest.fn()

  const cronService = {
    search,
    read,
    readLogs,
    setEnabled,
    runImmediately,
  }

  const createRes = () => {
    const json = jest.fn()
    return { json }
  }

  let controller: CronController

  beforeEach(() => {
    jest.clearAllMocks()
    controller = new CronController(cronService as any)
  })

  it('should return paginated cron tasks on search', async () => {
    search.mockResolvedValue([[{ name: 'task-1' }], 1])
    const res = createRes()

    await controller.search('task', 1, 10, res as any)

    expect(search).toHaveBeenCalledWith('task', { page: 1, limit: 10 })
    expect(res.json).toHaveBeenCalledWith({
      statusCode: 200,
      data: [{ name: 'task-1' }],
      total: 1,
    })
  })

  it('should throw NotFoundException when read task does not exist', async () => {
    read.mockResolvedValue(null)

    await expect(controller.read('missing-task', {} as any)).rejects.toThrow(NotFoundException)
  })

  it('should return task details on read', async () => {
    read.mockResolvedValue({ name: 'task-1' })
    const res = createRes()

    await controller.read('task-1', res as any)

    expect(res.json).toHaveBeenCalledWith({
      statusCode: 200,
      data: { name: 'task-1' },
    })
  })

  it('should throw NotFoundException when updating enabled state on missing task', async () => {
    setEnabled.mockResolvedValue(null)

    await expect(
      controller.updateEnabled('missing-task', { enabled: true } as any, {} as any),
    ).rejects.toThrow(NotFoundException)
  })

  it('should return updated task on updateEnabled', async () => {
    setEnabled.mockResolvedValue({ name: 'task-1', enabled: false })
    const res = createRes()

    await controller.updateEnabled('task-1', { enabled: false } as any, res as any)

    expect(setEnabled).toHaveBeenCalledWith('task-1', false)
    expect(res.json).toHaveBeenCalledWith({
      statusCode: 200,
      data: { name: 'task-1', enabled: false },
    })
  })

  it('should throw ConflictException when runImmediately returns busy', async () => {
    runImmediately.mockResolvedValue('busy')

    await expect(controller.runImmediately('task-1', {} as any)).rejects.toThrow(ConflictException)
  })

  it('should throw NotFoundException when runImmediately returns not_found', async () => {
    runImmediately.mockResolvedValue('not_found')

    await expect(controller.runImmediately('missing-task', {} as any)).rejects.toThrow(NotFoundException)
  })

  it('should return in_progress payload when runImmediately starts', async () => {
    runImmediately.mockResolvedValue('started')
    const res = createRes()

    await controller.runImmediately('task-1', res as any)

    expect(res.json).toHaveBeenCalledWith({
      statusCode: 200,
      data: {
        name: 'task-1',
        launched: true,
        status: 'in_progress',
      },
    })
  })
})

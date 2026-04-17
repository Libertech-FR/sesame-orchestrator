import { HealthHistoryService } from '~/core/health/health-history.service'

describe('HealthHistoryService', () => {
  const zrevrange = jest.fn()
  const zrangebyscore = jest.fn()
  const hmget = jest.fn()
  const redis = {
    zrevrange,
    zrangebyscore,
    hmget,
  }

  let service: HealthHistoryService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new HealthHistoryService(redis as any)
  })

  it('should return latest raw snapshot when payload is valid', async () => {
    zrevrange.mockResolvedValue([
      JSON.stringify({ timestamp: 1_700_000_000_000, status: 'ok', details: {}, system: {} }),
    ])

    const result = await service.getLatestRawSnapshot()

    expect(zrevrange).toHaveBeenCalledWith('core:health:history:raw', 0, 0)
    expect(result).toEqual({
      timestamp: 1_700_000_000_000,
      status: 'ok',
      details: {},
      system: {},
    })
  })

  it('should return null when latest raw snapshot cannot be parsed', async () => {
    zrevrange.mockResolvedValue(['not-json'])

    const result = await service.getLatestRawSnapshot()

    expect(result).toBeNull()
  })

  it('should return sorted live history and skip invalid entries', async () => {
    zrangebyscore.mockResolvedValue([
      JSON.stringify({ timestamp: 20, status: 'ok', details: {}, system: {} }),
      'invalid-json',
      JSON.stringify({ timestamp: 10, status: 'down', details: {}, system: {} }),
    ])

    const result = await service.getLiveHistory()

    expect(result).toEqual([
      { timestamp: 10, status: 'down', details: {}, system: {} },
      { timestamp: 20, status: 'ok', details: {}, system: {} },
    ])
  })

  it('should aggregate adaptive history from buckets', async () => {
    zrangebyscore
      .mockResolvedValueOnce(['d1']) // daily
      .mockResolvedValueOnce(['h1']) // hourly
      .mockResolvedValueOnce(['m1']) // 5m
    hmget
      .mockResolvedValueOnce([JSON.stringify({ timestamp: 10, status: 'ok', details: {}, system: {} })])
      .mockResolvedValueOnce([JSON.stringify({ timestamp: 20, status: 'ok', details: {}, system: {} })])
      .mockResolvedValueOnce([JSON.stringify({ timestamp: 30, status: 'ok', details: {}, system: {} })])

    const result = await service.getAdaptiveHistory()

    expect(result).toEqual([
      { timestamp: 10, status: 'ok', details: {}, system: {} },
      { timestamp: 20, status: 'ok', details: {}, system: {} },
      { timestamp: 30, status: 'ok', details: {}, system: {} },
    ])
  })

  it('should append and then return adaptive history', async () => {
    const appendSpy = jest.spyOn(service, 'appendSnapshot').mockResolvedValue(undefined)
    const adaptiveSpy = jest.spyOn(service, 'getAdaptiveHistory').mockResolvedValue([
      { timestamp: 1, status: 'ok', details: {}, system: {} },
    ] as any)

    const result = await service.appendAndGet({ status: 'ok', details: {}, system: {} })

    expect(appendSpy).toHaveBeenCalledTimes(1)
    expect(adaptiveSpy).toHaveBeenCalledTimes(1)
    expect(result).toEqual([{ timestamp: 1, status: 'ok', details: {}, system: {} }])
  })
})

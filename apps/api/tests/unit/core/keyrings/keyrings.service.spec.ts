import { AbstractServiceSchema } from '~/_common/abstracts/abstract.service.schema'
import { KeyringsService } from '~/core/keyrings/keyrings.service'

jest.mock('node:crypto', () => ({
  randomBytes: jest.fn(() => Buffer.from('abcd', 'hex')),
}))

describe('KeyringsService', () => {
  let service: KeyringsService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new KeyringsService({} as any)
  })

  it('should generate a token and delegate create to AbstractServiceSchema', async () => {
    const superCreateSpy = jest.spyOn(AbstractServiceSchema.prototype as any, 'create').mockResolvedValue({ _id: '1' })

    const result = await service.create({ name: 'api-key' } as any, { validateBeforeSave: false } as any)

    expect(superCreateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'api-key',
        token: 'abcd',
      }),
      { validateBeforeSave: false },
    )
    expect(result).toEqual({ _id: '1' })
  })
})

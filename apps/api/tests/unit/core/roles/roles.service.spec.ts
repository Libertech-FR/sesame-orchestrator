import { AbstractServiceSchema } from '~/_common/abstracts/abstract.service.schema'
import { RolesService } from '~/core/roles/roles.service'

describe('RolesService', () => {
  const model = {
    find: jest.fn(),
    findById: jest.fn(),
  }
  const discoveryService = {
    getControllers: jest.fn().mockReturnValue([]),
    getProviders: jest.fn().mockReturnValue([]),
  }
  const metadataScanner = {
    getAllMethodNames: jest.fn().mockReturnValue([]),
  }

  let service: RolesService

  beforeEach(() => {
    jest.clearAllMocks()
    model.find.mockReturnValue({
      lean: jest.fn().mockResolvedValue([]),
    })
    service = new RolesService(model as any, discoveryService as any, metadataScanner as any)
  })

  it('should force guest inheritance on create when inherits missing', async () => {
    const superCreateSpy = jest.spyOn(AbstractServiceSchema.prototype as any, 'create').mockResolvedValue({ _id: '1' })

    await service.e({ name: 'editor', displayName: 'Editor', description: 'Editor role' } as any)

    expect(superCreateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'editor',
        inherits: ['guest'],
      }),
      undefined,
    )
  })

  it('should reject creation for reserved internal role prefix', async () => {
    await expect(
      service.e({ name: 'interne_test', displayName: 'Internal', description: 'x' } as any),
    ).rejects.toThrow('You cannot create roles starting with "interne_"')
  })

  it('should normalize inherits on update and call super.update', async () => {
    model.findById.mockReturnValue({
      lean: jest.fn().mockResolvedValue({ name: 'editor', inherits: ['guest'] }),
    })
    model.find.mockReturnValue({
      lean: jest.fn().mockResolvedValue([{ name: 'manager', inherits: ['guest'] }]),
    })
    const superUpdateSpy = jest.spyOn(AbstractServiceSchema.prototype as any, 'update').mockResolvedValue({ ok: 1 })

    await service.update('507f1f77bcf86cd799439011' as any, { inherits: ['manager'] } as any)

    expect(superUpdateSpy).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439011',
      expect.objectContaining({ inherits: ['manager', 'guest'] }),
      undefined,
    )
  })
})

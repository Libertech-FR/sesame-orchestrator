import { RolesController } from '~/core/roles/roles.controller'

describe('RolesController', () => {
  const find = jest.fn()
  const getResources = jest.fn()
  const findAndCount = jest.fn()
  const findById = jest.fn()
  const create = jest.fn()
  const update = jest.fn()
  const removeDelete = jest.fn()
  const refresh = jest.fn()

  const rolesService = {
    find,
    getResources,
    findAndCount,
    findById,
    create,
    update,
    delete: removeDelete,
  }

  const aclRuntimeService = {
    refresh,
  }

  const createRes = () => {
    const json = jest.fn()
    const status = jest.fn(() => ({ json }))
    return { status, json }
  }

  let controller: RolesController

  beforeEach(() => {
    jest.clearAllMocks()
    controller = new RolesController(rolesService as any, aclRuntimeService as any)
  })

  it('should list roles and apply exclude filters', async () => {
    find.mockResolvedValue([
      { name: 'admin', displayName: 'Admin', description: 'admin role' },
      { name: 'custom', displayName: 'Custom', description: 'custom role' },
      { name: 'interne_x', displayName: 'Internal', description: 'internal role' },
    ])
    const res = createRes()

    await controller.list(res as any, 'true', 'true', 'true')

    expect(res.status).toHaveBeenCalledWith(200)
    const payload = (res.json as jest.Mock).mock.calls[0][0]
    expect(payload.statusCode).toBe(200)
    expect(payload.data.some((role: { name: string }) => role.name === 'admin')).toBe(false)
    expect(payload.data.some((role: { name: string }) => role.name === 'guest')).toBe(false)
    expect(payload.data.some((role: { name: string }) => role.name.startsWith('interne_'))).toBe(false)
  })

  it('should return resources list', async () => {
    getResources.mockResolvedValue([{ resource: '/core/roles' }])
    const res = createRes()

    await controller.resources(res as any)

    expect(getResources).toHaveBeenCalledTimes(1)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({
      statusCode: 200,
      data: [{ resource: '/core/roles' }],
    })
  })

  it('should search roles and return total', async () => {
    findAndCount.mockResolvedValue([[{ _id: '1', name: 'admin' }], 1])
    const res = createRes()

    await controller.search(res as any, 'adm', { deletedFlag: { $ne: true } } as any, { page: 1, limit: 10 } as any)

    expect(findAndCount).toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({
      statusCode: 200,
      total: 1,
      data: [{ _id: '1', name: 'admin' }],
    })
  })

  it('should read role and remove guest inheritance from payload', async () => {
    findById.mockResolvedValue({ _id: '1', name: 'custom', inherits: ['guest', 'manager'] })
    const res = createRes()

    await controller.read('507f1f77bcf86cd799439011' as any, res as any)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({
      statusCode: 200,
      data: { _id: '1', name: 'custom', inherits: ['manager'] },
    })
  })

  it('should create role and refresh ACL', async () => {
    create.mockResolvedValue({ _id: '1', name: 'custom' })
    const res = createRes()

    await controller.create(res as any, { name: 'custom' } as any)

    expect(create).toHaveBeenCalledWith({ name: 'custom' })
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(res.status).toHaveBeenCalledWith(201)
  })

  it('should update role and refresh ACL', async () => {
    update.mockResolvedValue({ _id: '1', name: 'custom', displayName: 'Custom' })
    const res = createRes()

    await controller.update('507f1f77bcf86cd799439011' as any, { displayName: 'Custom' } as any, res as any)

    expect(update).toHaveBeenCalled()
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(res.status).toHaveBeenCalledWith(200)
  })

  it('should delete role and refresh ACL', async () => {
    removeDelete.mockResolvedValue({ _id: '1' })
    const res = createRes()

    await controller.remove('507f1f77bcf86cd799439011' as any, res as any)

    expect(removeDelete).toHaveBeenCalled()
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(res.status).toHaveBeenCalledWith(200)
  })
})

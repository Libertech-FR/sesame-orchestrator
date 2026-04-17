import { KeyringsController } from '~/core/keyrings/keyrings.controller'

describe('KeyringsController', () => {
  const create = jest.fn()
  const findAndCount = jest.fn()
  const removeDelete = jest.fn()

  const service = {
    create,
    findAndCount,
    delete: removeDelete,
  }

  const createRes = () => {
    const json = jest.fn()
    const status = jest.fn(() => ({ json }))
    return { status, json }
  }

  let controller: KeyringsController

  beforeEach(() => {
    jest.clearAllMocks()
    controller = new KeyringsController(service as any)
  })

  it('should create keyring and return created payload', async () => {
    create.mockResolvedValue({ _id: '1', name: 'api-key' })
    const res = createRes()

    await controller.create(res as any, { name: 'api-key' } as any)

    expect(create).toHaveBeenCalledWith({ name: 'api-key' })
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith({
      statusCode: 201,
      data: { _id: '1', name: 'api-key' },
    })
  })

  it('should search keyrings with prefix regex filter', async () => {
    findAndCount.mockResolvedValue([[{ _id: '1' }], 1])
    const res = createRes()

    await controller.search(res as any, { deletedFlag: { $ne: true } } as any, { page: 1, limit: 10 } as any, 'adm')

    expect(findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({
        deletedFlag: { $ne: true },
        $or: [
          { name: { $regex: '^adm', $options: 'i' } },
          { roles: { $regex: '^adm', $options: 'i' } },
        ],
      }),
      expect.any(Object),
      { page: 1, limit: 10 },
    )
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({
      statusCode: 200,
      total: 1,
      data: [{ _id: '1' }],
    })
  })

  it('should delete keyring and return ok payload', async () => {
    removeDelete.mockResolvedValue({ _id: '1' })
    const res = createRes()

    await controller.remove('507f1f77bcf86cd799439011' as any, res as any)

    expect(removeDelete).toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({
      statusCode: 200,
      data: { _id: '1' },
    })
  })
})

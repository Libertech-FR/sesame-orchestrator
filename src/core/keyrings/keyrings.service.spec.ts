import { DeleteResult } from 'mongodb'
import { Test, TestingModule } from '@nestjs/testing'
import { KeyringsService } from './keyrings.service'
import { getModelToken } from '@nestjs/mongoose'
import { Keyrings } from '~/core/keyrings/_schemas/keyrings.schema'
import { Model, Types } from 'mongoose'

describe('KeyringsService', () => {
  let service: KeyringsService
  let model: Model<Keyrings>
  const _id = new Types.ObjectId()
  const date = new Date()
  const mockKeyrings: Keyrings = {
    _id,
    metadata: {
      createdAt: date,
      createdBy: 'console',
      lastUpdateAt: date,
      lastUpdateBy: 'console',
    },
    info: [],
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KeyringsService,
        {
          provide: getModelToken(Keyrings.name),
          useValue: Model,
        },
      ],
    }).compile()
    service = module.get<KeyringsService>(KeyringsService)
    model = module.get<Model<Keyrings>>(getModelToken(Keyrings.name))
  })

  describe('create', () => {
    it('should create a new record', async () => {
      const createTest = {}
      jest.spyOn(model, 'create').mockImplementationOnce(() => Promise.resolve(mockKeyrings))
      const result = await service.create(createTest)
      expect(result).toEqual(mockKeyrings)
    })
  })

  describe('search', () => {
    it('should return an array of records and total count', async () => {
      const expected = [mockKeyrings]
      const total = 1
      jest.spyOn(model, 'countDocuments').mockResolvedValueOnce(total)
      jest.spyOn(model, 'find').mockResolvedValueOnce(expected)
      const [result, resultTotal] = await service.search()
      expect(result).toEqual(expected)
      expect(resultTotal).toEqual(total)
    })

    it('should return an empty array if no records are found', async () => {
      const expected = []
      const total = 0
      jest.spyOn(model, 'countDocuments').mockResolvedValueOnce(total)
      jest.spyOn(model, 'find').mockResolvedValueOnce(expected)
      const [result, resultTotal] = await service.search()
      expect(result).toEqual(expected)
      expect(resultTotal).toEqual(total)
    })
  })

  describe('read', () => {
    it('should return a Keyrings record by ID', async () => {
      const expected = mockKeyrings
      jest.spyOn(model, 'findById').mockResolvedValueOnce(expected)
      const result = await service.read(_id.toString())
      expect(result).toEqual(expected)
    })

    it('should return null if Keyrings record is not found', async () => {
      const expected = null
      jest.spyOn(model, 'findById').mockResolvedValueOnce(expected)
      const result = await service.read('123')
      expect(result).toEqual(expected)
    })
  })

  describe('update', () => {
    it('should update a Keyrings record by ID with metadata', async () => {
      const keyringsDto = { info: { key: 'updated value' } }
      const newObject = { ...mockKeyrings }
      const expected = newObject.info.push(keyringsDto.info)
      jest.spyOn(model, 'findByIdAndUpdate').mockResolvedValueOnce(expected)
      const result = await service.update(_id.toString(), keyringsDto)
      expect(result).toEqual(expected)
    })
  })

  describe('remove', () => {
    it('should remove a Keyrings record by ID', async () => {
      const id = '123'
      const deleteResult: DeleteResult = { acknowledged: true, deletedCount: 1 }
      jest.spyOn(model, 'deleteOne').mockResolvedValueOnce(deleteResult)
      const result = await service.remove(id)
      expect(result).toEqual(deleteResult)
    })
  })
})

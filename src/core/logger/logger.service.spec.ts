import { DeleteResult } from 'mongodb'
import { Test, TestingModule } from '@nestjs/testing'
import { LoggerService } from './logger.service'
import { getModelToken } from '@nestjs/mongoose'
import { Logger } from './schemas/logger.schema'
import { Model, Types } from 'mongoose'

describe('LoggerService', () => {
  let service: LoggerService
  let model: Model<Logger>
  const _id = new Types.ObjectId()
  const date = new Date()
  const mockLogger: Logger = {
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
        LoggerService,
        {
          provide: getModelToken(Logger.name),
          useValue: Model,
        },
      ],
    }).compile()
    service = module.get<LoggerService>(LoggerService)
    model = module.get<Model<Logger>>(getModelToken(Logger.name))
  })

  describe('create', () => {
    it('should create a new record', async () => {
      const createTest = {}
      jest.spyOn(model, 'create').mockImplementationOnce(() => Promise.resolve(mockLogger))
      const result = await service.create(createTest)
      expect(result).toEqual(mockLogger)
    })
  })

  describe('search', () => {
    it('should return an array of records and total count', async () => {
      const expected = [mockLogger]
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
    it('should return a Logger record by ID', async () => {
      const expected = mockLogger
      jest.spyOn(model, 'findById').mockResolvedValueOnce(expected)
      const result = await service.read(_id.toString())
      expect(result).toEqual(expected)
    })

    it('should return null if Logger record is not found', async () => {
      const expected = null
      jest.spyOn(model, 'findById').mockResolvedValueOnce(expected)
      const result = await service.read('123')
      expect(result).toEqual(expected)
    })
  })

  describe('update', () => {
    it('should update a Logger record by ID with metadata', async () => {
      const loggerDto = { info: { key: 'updated value' } }
      const newObject = { ...mockLogger }
      const expected = newObject.info.push(loggerDto.info)
      jest.spyOn(model, 'findByIdAndUpdate').mockResolvedValueOnce(expected)
      const result = await service.update(_id.toString(), loggerDto)
      expect(result).toEqual(expected)
    })
  })

  describe('remove', () => {
    it('should remove a Logger record by ID', async () => {
      const id = '123'
      const deleteResult: DeleteResult = { acknowledged: true, deletedCount: 1 }
      jest.spyOn(model, 'deleteOne').mockResolvedValueOnce(deleteResult)
      const result = await service.remove(id)
      expect(result).toEqual(deleteResult)
    })
  })
})

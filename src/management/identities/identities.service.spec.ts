import { Test, TestingModule } from '@nestjs/testing';
import { IdentitiesService } from './identities.service';
import { getModelToken } from '@nestjs/mongoose';
import { Identities, IdentitiesSchema } from './_schemas/identities.schema';
import { IdentitiesController } from './identities.controller';
import { IdentitiesValidationModule } from './validations/identities.validation.module';
import { IdentitiesValidationService } from './validations/identities.validation.service';
import { FilterOptions } from '@streamkits/nestjs_module_scrud';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection, Model, Types, connect, Schema } from 'mongoose';
import { MockResponse, createResponse } from 'node-mocks-http';
import e, { Response } from 'express';
import { IdentitiesDtoStub } from './_stubs/identities.dto.stub';

describe('Identities Service', () => {
  let service: IdentitiesService;
  let model: Model<Identities>;
  let mongod: MongoMemoryServer;
  let mongoConnection: Connection;
  let identitiesModel: Model<Identities>;
  //let request: MockRequest<Request>;
  let response: MockResponse<Response>;
  const searchFilterOptions = {
    limit: 10,
    skip: 0,
    sort: {
      'metadata.createdAt': 'asc',
    },
  } as FilterOptions;
  let _id: Types.ObjectId;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create({
      binary: {
        version: '5.0.22',
      },
    });
    const uri = await mongod.getUri();
    mongoConnection = (await connect(uri)).connection;
    identitiesModel = mongoConnection.model<Identities>(Identities.name, IdentitiesSchema);
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IdentitiesController],
      providers: [
        IdentitiesService,
        { provide: getModelToken(Identities.name), useValue: identitiesModel },
        IdentitiesValidationService,
      ],
      imports: [IdentitiesValidationModule],
    }).compile();

    service = module.get<IdentitiesService>(IdentitiesService);
    _id = new Types.ObjectId();
    model = module.get<Model<Identities>>(getModelToken(Identities.name));
  }, 1200000);

  beforeEach(() => {
    response = createResponse();
  });

  afterAll(async () => {
    await mongoConnection.dropDatabase();
    await mongoConnection.close();
    await mongod.stop();
  });

  afterEach(() => {
    const collections = mongoConnection.collections;
    Object.keys(collections).forEach(async (key) => {
      await collections[key].deleteMany({});
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // describe('create', () => {
  //   it('should create a identity', async () => {
  //     const stub = { ...IdentitiesDtoStub(), _id: _id.toHexString() };
  //     let identity = new Identities();
  //     identity = { ...stub } as Identities;
  //     jest.spyOn(service, 'create').mockResolvedValueOnce(identity);
  //     const result = await service.create(stub);
  //     expect(result).toEqual(stub);
  //   });

  //   it('should throw an error when creating a identity', async () => {
  //     jest.spyOn(service, 'create').mockImplementationOnce(() => {
  //       throw new Error('Error');
  //     });
  //     await expect(service.create(IdentitiesDtoStub())).rejects.toThrow();
  //   });
  // });

  describe('findAndCount', () => {
    it('should return an array of identities', async () => {
      // Mock the countDocuments and find methods of the model
      const mockCount = jest.spyOn(model, 'countDocuments').mockResolvedValue(1);
      const mockFind = jest.spyOn(model, 'find').mockResolvedValue([IdentitiesDtoStub()]);

      // Call the service method
      const [result, count] = await service.findAndCount(searchFilterOptions);

      // Assert the results
      expect(mockCount).toHaveBeenCalledWith(searchFilterOptions);
      expect(mockFind).toHaveBeenCalledWith({}, {}, searchFilterOptions);
      expect(count).toBe(1);
      expect(result).toBe([IdentitiesDtoStub()]);
    });

    it('should throw an error when returning an array of identities', async () => {
      jest.spyOn(service, 'findAndCount').mockImplementationOnce(() => {
        throw new Error('Error');
      });
      await expect(service.findAndCount(searchFilterOptions)).rejects.toThrow();
    });
  });
});

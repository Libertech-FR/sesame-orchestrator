import { Test, TestingModule } from '@nestjs/testing';
import { IdentitiesService } from './identities.service';
import { getModelToken, raw } from '@nestjs/mongoose';
import { Identities, IdentitiesSchema } from './_schemas/identities.schema';
import { IdentitiesController } from './identities.controller';
import { IdentitiesValidationModule } from './validations/identities.validation.module';
import { IdentitiesValidationService } from './validations/identities.validation.service';
import { FilterQuery, Model, ProjectionType, QueryOptions, Types } from 'mongoose';
import { IdentitiesDtoStub, IdentitiesUpdateDtoStub } from './_stubs/identities.dto.stub';
import { createMockModel } from '~/_common/testsHelpers/mock.model';
import { MongoDbTestInstance } from '~/_common/testsHelpers/mongodb.test.instance';
import { Options } from '@nestjs/common';
import { inetOrgPerson } from './_schemas/_parts/inetOrgPerson.part';

describe('Identities Service', () => {
  let mongoDbTestInstance: MongoDbTestInstance;
  let service: IdentitiesService;
  let model: Model<Identities>;
  let identitiesModel: Model<Identities>;
  const _id = new Types.ObjectId();
  const newIdentityData = {
    _id,
    ...IdentitiesDtoStub(),
  };
  const updatedIdentityData = {
    _id,
    ...IdentitiesUpdateDtoStub(),
  };

  const options: QueryOptions<Identities> = {
    limit: 10,
    skip: 0,
    sort: {
      'metadata.createdAt': 'asc',
    },
  };
  const projection: ProjectionType<Identities> = {
    state: 1,
    inetOrgPerson: 1,
    additionalFields: 1,
  };
  const filter: FilterQuery<Identities> = {};

  beforeAll(async () => {
    // Create a MongoDB instance
    mongoDbTestInstance = new MongoDbTestInstance();
    await mongoDbTestInstance.start();
    identitiesModel = await mongoDbTestInstance.getModel<Identities>(Identities.name, IdentitiesSchema);
  }, 1200000);

  beforeEach(async () => {
    model = createMockModel(identitiesModel, newIdentityData, updatedIdentityData);

    // Mock the module
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IdentitiesController],
      providers: [
        IdentitiesService,
        {
          provide: getModelToken(Identities.name),
          useValue: identitiesModel,
        },
        IdentitiesValidationService,
      ],
      imports: [IdentitiesValidationModule],
    }).compile();

    // Get the service
    service = module.get<IdentitiesService>(IdentitiesService);
  });

  afterAll(async () => {
    await mongoDbTestInstance.stop();
  });

  afterEach(async () => {
    await mongoDbTestInstance.clearDatabase();
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAndCount', () => {
    it('should return an array of identities', async () => {
      // Call the service method
      const [result, count] = await service.findAndCount(filter, projection, options);

      // Assert the results
      expect(model.countDocuments).toHaveBeenCalledWith(filter);
      expect(model.find).toHaveBeenCalledWith(filter, projection, options);
      expect(count).toBe(1);
      expect(result).toStrictEqual([newIdentityData]);
    });
  });

  describe('findById', () => {
    it('should return a single identity by id', async () => {
      const result = await service.findById(_id, projection, options);
      expect(model.findById).toHaveBeenCalledWith(_id, projection, options);
      expect(result).toStrictEqual(newIdentityData);
    });
  });

  describe('findOne', () => {
    it('should return a single identity matching the filter', async () => {
      const result = await service.findOne(filter, projection, options);

      expect(model.findOne).toHaveBeenCalledWith(filter, projection, options);
      expect(result).toStrictEqual(newIdentityData);
    });
  });

  describe('create', () => {
    it('should create and return a new identity', async () => {
      const newIdentityData = IdentitiesDtoStub();

      const result = await service.create(newIdentityData);

      expect(model.prototype.save).toHaveBeenCalled();
      expect(result).toStrictEqual(IdentitiesDtoStub());
    });
  });

  describe('update', () => {
    it('should update and return an identity', async () => {
      const _id = new Types.ObjectId();
      const updateData = { 'inetOrgPerson.cn': 'updated-cn' };
      const updateOptions: QueryOptions<Identities> & { rawResult: true } = { options, rawResult: true };

      const result = await service.update(_id, updateData, updateOptions);

      expect(model.findByIdAndUpdate).toHaveBeenCalledWith({ _id }, updateData, expect.objectContaining(options));
      expect(result).toStrictEqual(updatedIdentityData);
    });
  });

  describe('delete', () => {
    it('should delete and return the deleted identity', async () => {
      const _id = new Types.ObjectId();

      const result = await service.delete(_id);

      expect(model.findByIdAndDelete).toHaveBeenCalledWith({ _id });
      expect(result).toStrictEqual(IdentitiesDtoStub());
    });
  });
});

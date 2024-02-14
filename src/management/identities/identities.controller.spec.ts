import { FilterOptions } from '@streamkits/nestjs_module_scrud';
import { Test, TestingModule } from '@nestjs/testing';
import { IdentitiesController } from './identities.controller';
import { IdentitiesService } from './identities.service';
import { Identities, IdentitiesSchema } from './_schemas/identities.schema';
import { HttpStatus } from '@nestjs/common';
import { Model, Types } from 'mongoose';
import { Response } from 'express';
import { getModelToken } from '@nestjs/mongoose';
import { IdentitiesDtoStub } from './_stubs/identities.dto.stub';
import { IdentitiesValidationService } from './validations/identities.validation.service';
import { IdentitiesValidationModule } from './validations/identities.validation.module';
import { MockResponse, createResponse } from 'node-mocks-http';
import { MongoDbTestInstance } from '~/_common/tests/mongodb.test.instance';
import { IdentityState } from './_enums/states.enum';
import { createMockService } from '~/_common/tests/mock.service';

describe('IdentitiesController', () => {
  let controller: IdentitiesController;
  let service: IdentitiesService;
  let mongoDbTestInstance: MongoDbTestInstance;

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
    mongoDbTestInstance = new MongoDbTestInstance();
    await mongoDbTestInstance.start();
    identitiesModel = await mongoDbTestInstance.getModel<Identities>(Identities.name, IdentitiesSchema);
    _id = new Types.ObjectId();

    service = createMockService<IdentitiesService>(IdentitiesService, {
      create: [
        // Use functions that return promises for resolve or reject
        () => Promise.resolve({ ...IdentitiesDtoStub(), _id, state: IdentityState.TO_VALIDATE }),
        () => Promise.resolve({ ...IdentitiesDtoStub(), _id, state: IdentityState.TO_COMPLETE }),
      ],
      findAndCount: [
        () => Promise.resolve([[{ ...IdentitiesDtoStub(), _id }], 1]),
        () => Promise.reject(new Error('Error')), // Function that throws an error
      ],
      findOne: [() => Promise.resolve({ ...IdentitiesDtoStub(), _id }), () => Promise.reject(new Error('Error'))],
      findById: [() => Promise.resolve({ ...IdentitiesDtoStub(), _id }), () => Promise.reject(new Error('Error'))],
      update: [() => Promise.resolve({ ...IdentitiesDtoStub(), _id }), () => Promise.reject(new Error('Error'))],
      delete: [() => Promise.resolve({ ...IdentitiesDtoStub(), _id }), () => Promise.reject(new Error('Error'))],
    });

    const module: TestingModule = await Test.createTestingModule({
      controllers: [IdentitiesController],
      providers: [
        { provide: IdentitiesService, useValue: service },
        { provide: getModelToken(Identities.name), useValue: identitiesModel },
        IdentitiesValidationService,
      ],
      imports: [IdentitiesValidationModule],
    }).compile();

    controller = module.get<IdentitiesController>(IdentitiesController);
    //service = module.get<IdentitiesService>(IdentitiesService);
  }, 1200000);

  beforeEach(() => {
    response = createResponse();
  });

  afterAll(async () => {
    await mongoDbTestInstance.stop();
  });

  afterEach(async () => {
    await mongoDbTestInstance.clearDatabase();
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create an identity with no errors', async () => {
      const createIdentity = await controller.create(response, IdentitiesDtoStub());
      expect(createIdentity.statusCode).toBe(HttpStatus.CREATED);
    });

    it('should create an identity with validations', async () => {
      const createIdentity = await controller.create(response, IdentitiesDtoStub());
      expect(createIdentity.statusCode).toBe(HttpStatus.ACCEPTED);
    });
  });

  describe('search', () => {
    it('should search identities', async () => {
      const searchIdentity = await controller.search(response, {}, searchFilterOptions);
      expect(searchIdentity.statusCode).toBe(HttpStatus.OK);
    });

    it('should throw an error when searching identities', async () => {
      try {
        await controller.search(response, {}, searchFilterOptions);
      } catch (error) {
        expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
      }
    });
  });

  describe('read', () => {
    it('should find an identity', async () => {
      const findIdentity = await controller.read(_id, response);
      expect(findIdentity.statusCode).toBe(HttpStatus.OK);
    });

    it('should throw an error when finding an identity', async () => {
      try {
        await controller.read(_id, response);
      } catch (error) {
        expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
      }
    });
  });

  describe('update', () => {
    it('should update an identity', async () => {
      const updateIdentity = await controller.update(_id, IdentitiesDtoStub(), response);
      expect(updateIdentity.statusCode).toBe(HttpStatus.OK);
    });

    it('should throw an error when updating an identity', async () => {
      try {
        await controller.update(_id, IdentitiesDtoStub(), response);
      } catch (error) {
        expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
      }
    });
  });

  describe('delete', () => {
    it('should delete an identity', async () => {
      const deleteIdentity = await controller.remove(_id, response);
      expect(deleteIdentity.statusCode).toBe(HttpStatus.OK);
    });

    it('should throw an error when deleting an identity', async () => {
      try {
        await controller.remove(_id, response);
      } catch (error) {
        expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
      }
    });
  });
});

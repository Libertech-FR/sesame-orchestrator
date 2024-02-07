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
import { ValidationSchemaException } from '~/_common/errors/ValidationException';
import { MongoDbTestInstance } from '~/_common/tests/mongodb.test.instance';

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

    const module: TestingModule = await Test.createTestingModule({
      controllers: [IdentitiesController],
      providers: [
        IdentitiesService,
        { provide: getModelToken(Identities.name), useValue: identitiesModel },
        IdentitiesValidationService,
      ],
      imports: [IdentitiesValidationModule],
    }).compile();

    controller = module.get<IdentitiesController>(IdentitiesController);
    service = module.get<IdentitiesService>(IdentitiesService);
    _id = new Types.ObjectId();
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
    it('should create an identity', async () => {
      jest.spyOn(service, 'create').mockResolvedValue(IdentitiesDtoStub() as Identities);

      const createIdentity = await controller.create(response, IdentitiesDtoStub());
      expect(createIdentity.statusCode).toMatch(new RegExp(`(${HttpStatus.CREATED})|(${HttpStatus.ACCEPTED})`));
    });

    // it('should handle ValidationSchemaException by returning the appropriate status code and message', async () => {
    //   jest.spyOn(service, 'create').mockRejectedValue(
    //     new ValidationSchemaException({
    //       message: 'Schema validation failed',
    //       validations: { field: 'error' },
    //       statusCode: HttpStatus.BAD_REQUEST,
    //     }),
    //   );

    //   const response = createResponse();
    //   const identity = IdentitiesDtoStub();
    //   const createIdentity = await controller.create(response, identity);
    //   expect(createIdentity.statusCode).toBe(HttpStatus.ACCEPTED);
    //   expect(response).toHaveProperty('greger');
    // });
  });

  describe('search', () => {
    it('should search identities', async () => {
      const searchIdentity = await controller.search(response, {}, searchFilterOptions);
      expect(searchIdentity.statusCode).toBe(HttpStatus.OK);
    });

    it('should throw an error when searching identities', async () => {
      jest.spyOn(service, 'findAndCount').mockRejectedValueOnce(new Error('Error'));
      try {
        await controller.search(response, {}, searchFilterOptions);
      } catch (error) {
        expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
      }
    });
  });

  describe('read', () => {
    it('should find an identity', async () => {
      const newIdentity = await service.create<Identities>(IdentitiesDtoStub());
      const _id = newIdentity.id;
      const findIdentity = await controller.read(_id, response);
      expect(findIdentity.statusCode).toBe(HttpStatus.OK);
    });

    it('should throw an error when finding an identity', async () => {
      jest.spyOn(service, 'findOne').mockRejectedValueOnce(new Error('Error'));
      try {
        await controller.read(_id, response);
      } catch (error) {
        expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
      }
    });
  });

  describe('update', () => {
    it('should update an identity', async () => {
      const newIdentity = await service.create<Identities>(IdentitiesDtoStub());
      const _id = newIdentity.id;
      const updateIdentity = await controller.update(_id, IdentitiesDtoStub(), response);
      expect(updateIdentity.statusCode).toBe(HttpStatus.OK);
    });

    it('should throw an error when updating an identity', async () => {
      jest.spyOn(service, 'update').mockRejectedValueOnce(new Error('Error'));
      try {
        await controller.update(_id, IdentitiesDtoStub(), response);
      } catch (error) {
        expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
      }
    });
  });

  describe('delete', () => {
    it('should delete an identity', async () => {
      const newIdentity = await service.create<Identities>(IdentitiesDtoStub());
      const _id = newIdentity.id;
      const deleteIdentity = await controller.remove(_id, response);
      expect(deleteIdentity.statusCode).toBe(HttpStatus.OK);
    });

    it('should throw an error when deleting an identity', async () => {
      jest.spyOn(service, 'delete').mockRejectedValueOnce(new Error('Error'));
      try {
        await controller.remove(_id, response);
      } catch (error) {
        expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
      }
    });
  });
});

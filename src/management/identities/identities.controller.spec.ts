import { FilterOptions } from '@streamkits/nestjs_module_scrud';
import { Test, TestingModule } from '@nestjs/testing';
import { IdentitiesController } from './identities.controller';
import { IdentitiesService } from './identities.service';
import { Identities, IdentitiesSchema } from './_schemas/identities.schema';
import { HttpStatus } from '@nestjs/common';
import { Connection, Model, Types, connect } from 'mongoose';
import { Response } from 'express';
import { getModelToken } from '@nestjs/mongoose';
import { IdentitiesDtoStub } from './_stubs/identities.dto.stub';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { IdentitiesValidationService } from './validations/identities.validation.service';
import { IdentitiesValidationModule } from './validations/identities.validation.module';
import { MockResponse, createResponse } from 'node-mocks-http';

describe('IdentitiesController', () => {
  let controller: IdentitiesController;
  let service: IdentitiesService;
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

    controller = module.get<IdentitiesController>(IdentitiesController);
    service = module.get<IdentitiesService>(IdentitiesService);
    _id = new Types.ObjectId();
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

  describe('create', () => {
    it('should create an identity', async () => {
      const createIdentity = await controller.create(response, IdentitiesDtoStub());
      expect(createIdentity.statusCode).toBe(HttpStatus.CREATED);
    });

    it('should throw an error when creating an identity', async () => {
      jest.spyOn(service, 'create').mockImplementationOnce(() => {
        throw new Error('Error');
      });
      const createIdentity = await controller.create(response, IdentitiesDtoStub());
      expect(createIdentity.statusCode).toBe(HttpStatus.BAD_REQUEST);
    });
  });

  describe('search', () => {
    it('should search identities', async () => {
      const searchIdentity = await controller.search(response, {}, searchFilterOptions);
      expect(searchIdentity.statusCode).toBe(HttpStatus.OK);
    });

    it('should throw an error when searching identities', async () => {
      jest.spyOn(service, 'findAndCount').mockImplementationOnce(() => {
        throw new Error('Error');
      });
      const searchIdentity = await controller.search(response, {}, searchFilterOptions);
      expect(searchIdentity.statusCode).toBe(HttpStatus.BAD_REQUEST);
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
      jest.spyOn(service, 'findOne').mockImplementationOnce(() => {
        throw new Error('Error');
      });
      const findIdentity = await controller.read(_id, response);
      expect(findIdentity.statusCode).toBe(HttpStatus.BAD_REQUEST);
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
      jest.spyOn(service, 'update').mockImplementationOnce(() => {
        throw new Error('Error');
      });
      const updateIdentity = await controller.update(_id, IdentitiesDtoStub(), response);
      expect(updateIdentity.statusCode).toBe(HttpStatus.BAD_REQUEST);
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
      jest.spyOn(service, 'delete').mockImplementationOnce(() => {
        throw new Error('Error');
      });
      const deleteIdentity = await controller.remove(_id, response);
      expect(deleteIdentity.statusCode).toBe(HttpStatus.BAD_REQUEST);
    });
  });
});

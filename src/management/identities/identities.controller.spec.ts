import { Test, TestingModule } from '@nestjs/testing';
import { IdentitiesController } from './identities.controller';
import { IdentitiesService } from './identities.service';
import { Identities, IdentitiesSchema } from './_schemas/identities.schema';
import { HttpStatus } from '@nestjs/common';
import { Connection, Model, connect } from 'mongoose';
import { Response, Request } from 'express';
import { getModelToken } from '@nestjs/mongoose';
import { IdentitiesDtoStub } from './_stubs/identities.dto.stub';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { IdentitiesValidationService } from './validations/identities.validation.service';
import { IdentitiesValidationModule } from './validations/identities.validation.module';
import { MockRequest, MockResponse, createResponse } from 'node-mocks-http';

describe('IdentitiesController', () => {
  let controller: IdentitiesController;
  let service: IdentitiesService;
  let mongod: MongoMemoryServer;
  let mongoConnection: Connection;
  let identitiesModel: Model<Identities>;
  //let request: MockRequest<Request>;
  let response: MockResponse<Response>;

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
      expect(createIdentity).toHaveProperty('id');
    });

    it('should throw an error when creating an identity', async () => {
      jest.spyOn(service, 'create').mockImplementationOnce(() => {
        throw new Error('Error');
      });
      const createIdentity = await controller.create(response, IdentitiesDtoStub());
      expect(createIdentity.statusCode).toBe(HttpStatus.BAD_REQUEST);
      expect(createIdentity).toBe('Error');
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { IdentitiesController } from './identities.controller';
import { IdentitiesService } from './identities.service';
import { Identities, IdentitiesSchema } from './_schemas/identities.schema';
import { HttpStatus } from '@nestjs/common';
import { Connection, Model, connect } from 'mongoose';
import { Response } from 'express';
import { getModelToken } from '@nestjs/mongoose';
import { IdentitiesDtoStub } from './_stubs/identities.dto.stub';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { IdentitiesValidationService } from './validations/identities.validation.service';
import { IdentitiesValidationModule } from './validations/identities.validation.module';

describe('IdentitiesController', () => {
  let controller: IdentitiesController;
  let service: IdentitiesService;
  let mongod: MongoMemoryServer;
  let mongoConnection: Connection;
  let identitiesModel: Model<Identities>;

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
      let res: Response<{
        statusCode: number;
        data: Identities;
      }>;
      const createIdentity = await controller.create<Identities>(res, IdentitiesDtoStub());
      expect(createIdentity.statusCode).toBe(HttpStatus.CREATED);
      expect(createIdentity.locals.data.inetOrgPerson).toBe(IdentitiesDtoStub().inetOrgPerson);
      expect(createIdentity.locals.data.additionalFields).toBe(IdentitiesDtoStub().additionalFields);
    });

    it('should throw an error when creating an identity', async () => {
      let res: Response;
      jest.spyOn(service, 'create').mockImplementationOnce(() => {
        throw new Error('Error');
      });
      const createIdentity = await controller.create(res, IdentitiesDtoStub());
      expect(createIdentity.statusCode).toBe(HttpStatus.BAD_REQUEST);
    });
  });
});

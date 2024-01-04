import { Test, TestingModule } from '@nestjs/testing';
import { IdentitiesService } from './identities.service';
import { getModelToken } from '@nestjs/mongoose';
import { Identities, IdentitiesSchema } from './_schemas/identities.schema';
import { IdentitiesController } from './identities.controller';
import { IdentitiesValidationModule } from './validations/identities.validation.module';
import { IdentitiesValidationService } from './validations/identities.validation.service';
import { FilterOptions } from '@streamkits/nestjs_module_scrud';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection, Model, Types, connect } from 'mongoose';
import { MockResponse, createResponse } from 'node-mocks-http';
import { Response } from 'express';

describe('Identities Service', () => {
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

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

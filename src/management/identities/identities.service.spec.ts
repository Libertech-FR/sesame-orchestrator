import { Test, TestingModule } from '@nestjs/testing';
import { IdentitiesService } from './identities.service';
import { getModelToken } from '@nestjs/mongoose';
import { Identities, IdentitiesSchema } from './_schemas/identities.schema';
import { IdentitiesController } from './identities.controller';
import { IdentitiesValidationModule } from './validations/identities.validation.module';
import { IdentitiesValidationService } from './validations/identities.validation.service';
import { FilterQuery, Model, ProjectionType, QueryOptions, Types } from 'mongoose';
import { IdentitiesDtoStub, IdentitiesUpdateDtoStub } from './_stubs/identities.dto.stub';
import { createMockModel } from '~/_common/tests/mock.model';
import { MongoDbTestInstance } from '~/_common/tests/mongodb.test.instance';
import {
  createAssertions,
  createErrorAssertions,
  deleteAssertions,
  deleteErrorAssertions,
  findAndCountAssertions,
  findAndCountErrorAssertions,
  findByIdAssertions,
  findByIdErrorAssertions,
  findOneAssertions,
  findOneErrorAssertions,
  updateAssertions,
  updateErrorAssertions,
} from '~/_common/tests/service.assertions.utils';

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
  }, 120000);

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
    it('should return an array of identities or throw an error', async () => {
      findAndCountAssertions<Identities>(service, model, filter, projection, options, newIdentityData);
      findAndCountErrorAssertions<Identities>(service, filter, projection, options);
    });
    //it('should throw a Notfound error', async () => {});
  });

  describe('findById', () => {
    it('should return a single identity by id or throw an error', async () => {
      findByIdAssertions<Identities>(service, model, _id, projection, options, newIdentityData);
    });
    it('should return an empty array and count 0 documents', async () => {
      findByIdErrorAssertions<Identities>(service, _id, projection, options);
    });
  });

  describe('findOne', () => {
    it('should return a single identity matching the filter or throw an error', async () => {
      findOneAssertions<Identities>(service, model, _id, projection, options, newIdentityData);
    });
    it('should throw a Notfound error', async () => {
      findOneErrorAssertions<Identities>(service, _id, projection, options);
    });
  });

  describe('create', () => {
    it('should create and return a new identity or throw an error', async () => {
      createAssertions<Identities>(service, model, newIdentityData, newIdentityData);
    });
    it('should throw a Notfound error', async () => {
      createErrorAssertions<Identities>(service, newIdentityData);
    });
  });

  describe('update', () => {
    it('should update and return an identity or throw an error', async () => {
      const updateData = {
        'inetOrgPerson.cn': 'updated-cn',
      };
      const updateOptions: QueryOptions<Identities> & { rawResult: true } = {
        options: options,
        rawResult: true,
      };

      updateAssertions(service, model, _id, updateData, updateOptions, updatedIdentityData);
    });
    it('should throw a Notfound error', async () => {
      const updateData = {
        'inetOrgPerson.cn': 'updated-cn',
      };
      const updateOptions: QueryOptions<Identities> & { rawResult: true } = {
        options: options,
        rawResult: true,
      };

      updateErrorAssertions(service, _id, updateData, updateOptions);
    });
  });

  describe('delete', () => {
    it('should delete and return the deleted identity or throw an error', async () => {
      deleteAssertions<Identities>(service, model, _id, options, newIdentityData);
    });
    it('should throw a Notfound error', async () => {
      deleteErrorAssertions<Identities>(service, _id, options);
    });
  });
});

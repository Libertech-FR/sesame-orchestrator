import { Test, TestingModule } from '@nestjs/testing';
import { IdentitiesService } from './identities.service';
import { getModelToken } from '@nestjs/mongoose';
import { Identities, IdentitiesSchema } from './_schemas/identities.schema';
import { IdentitiesController } from './identities.controller';
import { IdentitiesValidationModule } from './validations/identities.validation.module';
import { IdentitiesValidationService } from './validations/identities.validation.service';
import { FilterQuery, Model, ProjectionType, QueryOptions } from 'mongoose';
import { IdentitiesDtoStub } from './_stubs/identities.dto.stub';
import { createMockModel } from '~/_common/testsHelpers/mock.model';
import { MongoDbTestInstance } from '~/_common/testsHelpers/mongo.mermory.server';

describe('Identities Service', () => {
  let mongoDbTestInstance: MongoDbTestInstance;
  let service: IdentitiesService;
  let model: Model<Identities>;
  let identitiesModel: Model<Identities>;
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
    model = createMockModel(identitiesModel, IdentitiesDtoStub);

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
      expect(result).toStrictEqual([IdentitiesDtoStub()]);
    });
  });
});

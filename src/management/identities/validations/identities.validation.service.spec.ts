import { Test, TestingModule } from '@nestjs/testing';
import { IdentitiesValidationService } from './identities.validation.service';
import * as fs from 'fs';
import { ValidationConfigException, ValidationSchemaException } from '~/_common/errors/ValidationException';
import {
  invalidObjectClassAdditionalFieldsStub,
  invalidRequiredAdditionalFieldsStub,
  invalidTypeAdditionalFieldsStub,
  missingAttributeAdditionalFieldsStub,
  validSchemaStub,
  validAdditionalFieldsStub,
} from './_stubs/identities.validation.stub';
import Ajv from 'ajv';
import ajvErrors from 'ajv-errors';

jest.mock('fs');

describe('IdentitiesValidationService', () => {
  let service: IdentitiesValidationService;
  let mockAjv: jest.Mocked<Ajv>;
  let mockFs: jest.Mocked<typeof fs>;

  beforeAll(() => {});

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IdentitiesValidationService],
    }).compile();

    service = module.get<IdentitiesValidationService>(IdentitiesValidationService);

    mockAjv = new Ajv({ allErrors: true }) as jest.Mocked<Ajv>;
    ajvErrors(mockAjv);

    mockFs = fs as jest.Mocked<typeof fs>;
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(JSON.stringify(validSchemaStub));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('test Exceptions thrown', () => {
    describe('test ValidConfigException', () => {
      it('should throw ValidationConfigException for missing attributes', async () => {
        const data = missingAttributeAdditionalFieldsStub();
        await expect(service.validate(data)).rejects.toThrow(ValidationConfigException);
      });

      it('should throw ValidationConfigException when object class is not found in attributes', async () => {
        const data = invalidObjectClassAdditionalFieldsStub();
        await expect(service.validate(data)).rejects.toThrow(ValidationConfigException);
      });

      it('should throw ValidationConfigException for not found schema', async () => {
        mockFs.existsSync.mockReturnValue(false);
        const data = validAdditionalFieldsStub();
        await expect(service.validate(data)).rejects.toThrow(ValidationConfigException);
      });

      it('should throw ValidationConfigException for invalid schema', async () => {
        mockFs.readFileSync.mockReturnValue('invalid content');
        const data = validAdditionalFieldsStub();
        await expect(service.validate(data)).rejects.toThrow(ValidationConfigException);
      });
    });

    describe('test ValidationSchemaException', () => {
      it('should throw ValidationSchemaException for invalid required attribute', async () => {
        const data = invalidRequiredAdditionalFieldsStub();
        await expect(service.validate(data)).rejects.toThrow(ValidationSchemaException);
      });

      it('should throw ValidationSchemaException for invalid attribute type', async () => {
        const data = invalidTypeAdditionalFieldsStub();
        await expect(service.validate(data)).rejects.toThrow(ValidationSchemaException);
      });
    });
  });

  describe('validation success', () => {
    it('should validate additional fields successfully', async () => {
      const data = validAdditionalFieldsStub();
      await expect(service.validate(data)).resolves.toEqual({ message: 'Validation succeeded' });
    });
  });

  describe('test validateAttribute', () => {
    it('should return null for a valid attribute', async () => {
      const key = validAdditionalFieldsStub().objectClasses[0];
      const attribute = validAdditionalFieldsStub().attributes[key];
      await expect(service.validateAttribute(key, attribute)).resolves.toBeNull();
    });
  });
});

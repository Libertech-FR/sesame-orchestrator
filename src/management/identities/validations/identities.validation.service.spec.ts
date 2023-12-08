import { IdentitiesValidationService } from './identities.validation.service';
import * as yup from 'yup';
import fs from 'fs';
import yaml from 'yaml';

jest.mock('yup');

describe('IdentitiesValidationService', () => {
  let service: IdentitiesValidationService;

  beforeEach(() => {
    jest.spyOn(fs, 'readFileSync').mockReturnValue('valid yml content');
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    jest.spyOn(yaml, 'parse').mockReturnValue({ attributes: [] });
    service = new IdentitiesValidationService();
    jest.clearAllMocks();
  });

  it('should reject when config file is missing', async () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(false);
    const data = { objectClasses: ['testClass'], attributes: { testClass: {} } };
    await expect(service.validate(data)).rejects.toMatchObject({
      message: 'Validation failed',
    });
  });

  it('should reject when object class is not found in attributes', async () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    jest.spyOn(yaml, 'parse').mockReturnValue({ attributes: [] }); // Mocked schema
    const data = { objectClasses: ['testClass'], attributes: { supann: { test: 'test' } } };
    await expect(service.validate(data)).rejects.toMatchObject({
      message: 'Validation failed',
    });
  });

  it('should reject on yup schema validation error', async () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    jest.spyOn(yaml, 'parse').mockReturnValue({ attributes: [] }); // Mocked schema
    const mockYupObject = { validate: jest.fn() };
    const mockValidationError = new yup.ValidationError('error', {}, 'test');
    mockValidationError.inner = [
      {
        path: 'test',
        errors: ['error'],
        value: 'test',
        inner: [],
        name: 'test',
        message: 'test',
        [Symbol.toStringTag]: 'test',
      },
    ];
    mockValidationError.errors = ['error'];
    mockYupObject.validate.mockRejectedValue(mockValidationError);
    service.createSchema = jest.fn().mockResolvedValue(mockYupObject);

    const data = { objectClasses: ['testClass'], attributes: { testClass: {} } };
    await expect(service.validate(data)).rejects.toMatchObject({
      message: 'Validation failed',
    });
  });

  it('should resolve on successful validation', async () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    jest.spyOn(yaml, 'parse').mockReturnValue({ attributes: [] }); // Mocked schema
    const mockYupObject = { validate: jest.fn() };
    mockYupObject.validate.mockResolvedValue('validated');
    service.createSchema = jest.fn().mockResolvedValue(mockYupObject);

    const data = { objectClasses: ['testClass'], attributes: { testClass: {} } };
    await expect(service.validate(data)).resolves.toBeDefined();
  });
});

// describe('createSchema', () => {
//   let service: IdentitiesValidationService;

//   beforeEach(() => {
//     service = new IdentitiesValidationService();
//   });

//   it('should create a schema based on input attributes', async () => {
//     const attributes = [{ name: 'test', type: 'string', required: true }];
//     const schema = await service.createSchema(attributes);
//     expect(yup.object).toHaveBeenCalled();
//     expect(schema).toBeDefined();
//   });
// });

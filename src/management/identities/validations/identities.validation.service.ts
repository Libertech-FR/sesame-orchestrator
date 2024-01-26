import { BadRequestException, Injectable } from '@nestjs/common';
import { parse } from 'yaml';
import { existsSync, readFileSync } from 'fs';
import { ConfigObjectSchemaDTO } from './_dto/config.dto';
import * as yup from 'yup';
import { construct, diff } from 'radash';
import { AdditionalFieldsPart } from '../_schemas/_parts/additionalFields.part.schema';
import Ajv from 'ajv';
import { buildYup } from 'schema-to-yup';
import ajvErrors from 'ajv-errors';
import validSchema from './_config/validSchema';
import { BadConfig } from '~/_common/errors/BadConfig';

/**
 * Service responsible for validating identities.
 */
@Injectable()
export class IdentitiesValidationService {
  private ajv: Ajv = new Ajv({ allErrors: true });
  private validateSchema;

  constructor() {
    ajvErrors(this.ajv);
    this.validateSchema = this.ajv.compile(validSchema);
  }

  /**
   * Validates additional fields for identities.
   * @param data - The additional fields data to validate.
   * @returns A promise that resolves if validation succeeds, or rejects with validation errors.
   */
  async validate(data: AdditionalFieldsPart): Promise<object> {
    const objectClasses = data.objectClasses;
    const attributes = data.attributes;
    const attributesKeys = Object.keys(attributes);
    const validations = {};
    let reject = false;

    // Check for missing attributes
    for (const attribute of diff(objectClasses, attributesKeys)) {
      validations[attribute] = `Missing attribute '${attribute}'`;
      reject = true;
    }

    for (const key of attributesKeys) {
      if (!objectClasses.includes(key)) {
        validations[key] =
          `${key} is not a valid object class in this context, valid object classes are: ${objectClasses.join(', ')}'`;
        reject = true;
        continue;
      }

      const path = `./src/management/identities/validations/_config/${key}.yml`;
      if (!existsSync(path)) {
        validations[key] = `Config '${key}.yml' not found`;
        reject = true;
        continue;
      }

      const schema: ConfigObjectSchemaDTO = parse(readFileSync(path, 'utf8'));
      if (!this.validateSchema(schema)) {
        validations[key] = `Schema ${key}.yml invalide: ${this.ajv.errorsText(this.validateSchema.errors)}`;
        reject = true;
        continue;
      }
    }

    if (reject) {
      throw new BadRequestException(validations);
    }

    // Validate each attribute
    for (const key of attributesKeys) {
      const validationError = await this.validateAttribute(key, attributes[key]);
      if (validationError) {
        validations[key] = validationError;
        reject = true;
      }
    }

    if (reject) {
      return Promise.reject({
        message: 'Validation failed',
        validations: construct(validations),
      });
    }
    return Promise.resolve({ message: 'Validation succeeded' });
  }

  /**
   * Validates a single attribute.
   * @param key - The key of the attribute to validate.
   * @param attribute - The attribute value to validate.
   * @returns A promise that resolves with an error message if validation fails, otherwise null.
   */
  private async validateAttribute(key: string, attribute: any): Promise<string | null> {
    const path = `./src/management/identities/validations/_config/${key}.yml`;
    const schema: ConfigObjectSchemaDTO = parse(readFileSync(path, 'utf8'));

    const yupSchema = buildYup(schema, { noSortEdges: true });
    try {
      await yupSchema.validate(attribute, { strict: true, abortEarly: false });
      return null;
    } catch (error) {
      return error.inner.map((err) => `${key}.${err.path}: ${err.errors[0]}`).join(', ');
    }
  }
}

import { Injectable } from '@nestjs/common';
import { parse } from 'yaml';
import { existsSync, readFileSync } from 'fs';
import { ConfigObjectAttributeDTO, ConfigObjectSchemaDTO } from './_dto/config.dto';
import * as yup from 'yup';
import { construct, diff } from 'radash';
import { AdditionalFieldsPart } from '../_schemas/_parts/additionalFields.part.schema';

@Injectable()
export class IdentitiesValidationService {
  constructor() {}

  async validate(data: AdditionalFieldsPart): Promise<any> {
    const objectClasses = data.objectClasses;
    const attributes = data.attributes;
    const attributesKeys = Object.keys(attributes);
    const validations = {};

    const missingAtribute = diff(objectClasses, attributesKeys);
    if (missingAtribute.length > 0) {
      for (const attribute of missingAtribute) {
        validations[attribute] = `Missing attribute '${attribute}'`;
      }
    }

    let reject = false;
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
      const yupSchema = await this.createSchema(schema.attributes);
      try {
        const validation = await yupSchema.validate(attributes[key], { strict: true, abortEarly: false });
        validations[key] = validation;
      } catch (error) {
        if (error instanceof yup.ValidationError) {
          error.inner.forEach((err) => {
            validations[`${key}.${err.path}`] = err.errors[0];
          });
          reject = true;
        }
      }
    }
    if (reject) {
      return Promise.reject({
        message: 'Validation failed',
        validations: construct(validations),
      });
    }
    return Promise.resolve(construct(validations));
  }

  private getValidator(type, required = false) {
    let validator = null;
    switch (type) {
      case 'string':
        validator = yup.string();
      case 'number':
        validator = yup.number();
      case 'boolean':
        validator = yup.boolean();
      case 'date':
        validator = yup.date();
      case 'array':
        validator = yup.array();
      case 'object':
        validator = yup.object();
      default:
        validator = yup.string();
    }

    if (required) {
      validator = validator.required();
    }

    return validator;
  }

  async createSchema(attributes: ConfigObjectAttributeDTO[]) {
    const schema = attributes.reduce((acc, attribute) => {
      acc[attribute.name] = this.getValidator(attribute.type, attribute.required);
      return acc;
    }, {});
    return yup.object().shape(schema);
  }
}

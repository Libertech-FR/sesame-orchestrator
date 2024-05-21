import { Injectable, Logger } from '@nestjs/common';
import { parse } from 'yaml';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { ConfigObjectSchemaDTO } from './_dto/config.dto';
import { diff } from 'radash';
import { AdditionalFieldsPart } from '../_schemas/_parts/additionalFields.part.schema';
import Ajv from 'ajv';
import { buildYup } from 'schema-to-yup';
import ajvErrors from 'ajv-errors';
import validSchema from './_config/validSchema';
import { ValidationConfigException, ValidationSchemaException } from '~/_common/errors/ValidationException';
import { additionalFieldsPartDto } from '../_dto/_parts/additionalFields.dto';

/**
 * Service responsible for validating identities.
 */
@Injectable()
export class IdentitiesValidationService {
  private ajv: Ajv = new Ajv({ allErrors: true });
  private validateSchema;
  private logger: Logger;

  constructor() {
    ajvErrors(this.ajv);
    this.validateSchema = this.ajv.compile(validSchema);
    this.logger = new Logger();
  }

  private resolveConfigPath(key: string): string | null {
    const hardConfigPath = `./src/management/identities/validations/_config/${key}.yml`;
    const dynamicConfigPath = `./configs/identities/validations/${key}.yml`;
    if (existsSync(dynamicConfigPath)) {
      return dynamicConfigPath;
    }
    if (existsSync(hardConfigPath)) {
      return hardConfigPath;
    }
    return null;
  }

  /**
   * Validates additional fields for identities.
   * @param data - The additional fields data to validate.
   * @returns A promise that resolves if validation succeeds, or rejects with validation errors.
   */
  async validate(data: AdditionalFieldsPart | additionalFieldsPartDto): Promise<object> {
    const objectClasses = data.objectClasses;
    const attributes = data.attributes;
    const attributesKeys = Object.keys(attributes);
    const validations = {};
    let reject = false;

    // Check for missing attributes
    for (const attribute of diff(objectClasses, attributesKeys)) {
      validations[attribute] = `Attribut '${attribute}' manquant dans les champs additionnels`;
      reject = true;
    }

    for (const key of attributesKeys) {
      // Check for invalid object classes
      if (!objectClasses.includes(key)) {
        validations[key] =
          `${key} n'est pas une classe d'objet valide dans ce contexte, les classes d'objets valides sont: ${objectClasses.join(
            ', ',
          )}'`;
        reject = true;
        continue;
      }

      // Check for missing schema files
      const path = this.resolveConfigPath(key);
      if (!existsSync(path)) {
        validations[key] = `Fichier de config '${key}.yml' introuvable`;
        reject = true;
        continue;
      }

      // Check for invalid schema
      const schema: ConfigObjectSchemaDTO = parse(readFileSync(path, 'utf8'));
      if (!this.validateSchema(schema)) {
        validations[key] = `Schema ${key}.yml invalide: ${this.ajv.errorsText(this.validateSchema.errors)}`;
        reject = true;
        continue;
      }
    }

    if (reject) {
      throw new ValidationConfigException({ validations });
    }

    // Validate each attribute
    for (const key of attributesKeys) {
      const validationError = await this.validateAttribute(key, attributes[key]);
      if (validationError) {
        validations[key] = validationError;
        reject = true;
      } else {
        delete validations[key];
      }
    }

    if (reject) {
      throw new ValidationSchemaException({ validations });
    }
    return Promise.resolve({ message: 'Validation succeeded' });
  }

  /**
   * Validates a single attribute.
   * @param key - The key of the attribute to validate.
   * @param attribute - The attribute value to validate.
   * @returns A promise that resolves with an error message if validation fails, otherwise null.
   */
  public async validateAttribute(key: string, attribute: any): Promise<string | null> {
    const path = this.resolveConfigPath(key);
    const schema: ConfigObjectSchemaDTO = parse(readFileSync(path, 'utf8'));

    const yupSchema = buildYup(schema, { noSortEdges: true });
    try {
      await yupSchema.validate(attribute, { strict: true, abortEarly: false });
      return null;
    } catch (error) {
      return error.inner.reduce((acc, err) => {
        acc[err.path] = err.message;
        return acc;
      }, {});
    }
  }

  async findAll(): Promise<any> {
    this.logger.debug(['findAll', JSON.stringify(Object.values(arguments))].join(' '));
    const hardConfigPath = './src/management/identities/validations/_config';
    const dynamicConfigPath = './configs/identities/validations';
    // Retrieve files from each directory and tag them with their source
    const hardConfigFiles = readdirSync(hardConfigPath).map((file) => ({
      file,
      path: hardConfigPath,
      source: 'hardConfig',
    }));
    const dynamicConfigFiles = readdirSync(dynamicConfigPath).map((file) => ({
      file,
      path: dynamicConfigPath,
      source: 'dynamicConfig',
    }));

    // Combine the file arrays
    const files = [...hardConfigFiles, ...dynamicConfigFiles];

    const result = [];
    for (const fileObj of files) {
      const filePath = `${fileObj.path}/${fileObj.file}`;
      const data = parse(readFileSync(filePath, 'utf-8'));
      const key = fileObj.file.replace('.yml', '');
      result.push({ [key]: data, source: fileObj.source });
    }
    return [result, files.length];
  }

  async findOne(schema): Promise<any> {
    this.logger.debug(['findOne', JSON.stringify(Object.values(arguments))].join(' '));
    const filePath = this.resolveConfigPath(schema);
    if (!existsSync(filePath)) {
      const message = `File not found: ${filePath}`;
      throw new ValidationConfigException({ message });
    }

    return parse(readFileSync(filePath, 'utf-8'));
  }
}

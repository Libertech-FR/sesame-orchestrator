import { BadRequestException, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { parse } from 'yaml';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import { ConfigObjectSchemaDTO } from './_dto/config.dto';
import { diff } from 'radash';
import { AdditionalFieldsPart } from '../_schemas/_parts/additionalFields.part.schema';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import localize from 'ajv-i18n';
import validSchema from './_config/validSchema';
import ajvErrors from 'ajv-errors';
import { ValidationConfigException, ValidationSchemaException } from '~/_common/errors/ValidationException';
import { additionalFieldsPartDto } from '../_dto/_parts/additionalFields.dto';
import { ConfigService } from "@nestjs/config";

/**
 * Service responsible for validating identities.
 */
@Injectable()
export class IdentitiesValidationService implements OnApplicationBootstrap {
  private ajv: Ajv = new Ajv({ allErrors: true });
  private validateSchema;
  private logger: Logger;

  public constructor(protected config: ConfigService) {
    addFormats(this.ajv);
    ajvErrors(this.ajv);
    this.ajv.addFormat('number', /^\d*$/);
    this.validateSchema = this.ajv.compile(validSchema);
    this.logger = new Logger(IdentitiesValidationService.name);

  }

  public onApplicationBootstrap(): void {
    let files = [];
    let defaultFiles = [];

    this.logger.log('Initializing identities validations service');

    try {
      files = readdirSync(`${process.cwd()}/configs/identities/validations`);
      defaultFiles = readdirSync(`${process.cwd()}/defaults/identities/validations`);
    } catch (error) {
      this.logger.error('Error reading identities validations files', error.message, error.stack);
    }

    for (const file of defaultFiles) {
      if (!files.includes(file)) {
        try {
          const defaultFile = readFileSync(`${process.cwd()}/defaults/identities/validations/${file}`, 'utf-8');
          writeFileSync(`${process.cwd()}/configs/identities/validations/${file}`, defaultFile);
          this.logger.warn(`Copied default validation file: ${file}`);
        } catch (error) {
          this.logger.error(`Error copying default validation file: ${file}`, error.message, error.stack);
        }
      }
    }

    this.logger.log('Identities validations service initialized');
  }

  private resolveConfigPath(key: string): string | null {
    //lecture deja dans le repertoire /validation pour les schemas non modifiables
    const hardConfigPath = `./validation/${key}.yml`;
    const dynamicConfigPath = `./configs/identities/validations/${key}.yml`;
    if (existsSync(hardConfigPath)) {
      return hardConfigPath;
    }
    if (existsSync(dynamicConfigPath)) {
      return dynamicConfigPath;
    }
    return null;
  }

  public async transform(data: Partial<AdditionalFieldsPart | additionalFieldsPartDto> = {}): Promise<Partial<AdditionalFieldsPart | additionalFieldsPartDto>> {
    if (!data.objectClasses) {
      data.objectClasses = [];
    }
    if (!data.attributes) {
      data.attributes = {};
    }
    data.validations = {};

    const attributes = data.attributes || {};
    const attributesKeys = Object.keys(attributes);

    //test si il y a les attributs sans attributes
    await this.checkAndCreateObjectClasses(data);
    for (const key of attributesKeys) {
      await this.transformAttribute(key, attributes[key], attributes);
    }

    return data
  }

  /**
   * check objectclasses and add missing keys
   * @param data
   */
  public async checkAndCreateObjectClasses(data) {
    const objectClasses = data.objectClasses || [];
    const attributes = data.attributes || {};
    const attributesKeys = Object.keys(attributes);
    for (const objectclass of objectClasses) {
      if (!attributesKeys.includes(objectclass)) {
        this.logger.log(objectclass + " attribute not found creating");
        await this.createAttributes(objectclass, data);
      }
    }
  }
  private async createAttributes(key: string, data: any) {

    // Validate the key to prevent prototype pollution
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      this.logger.error('Invalid key: ' + key);
      throw new BadRequestException('Invalid key: ' + key);
    }
    const path = this.resolveConfigPath(key);
    if (path === null) {
      this.logger.error('schema for ' + key + ' does not exist');
      throw new BadRequestException('schema for ' + key + ' does not exist');
    }
    const schema: any = parse(readFileSync(path, 'utf8'));
    //creation de la clé
    data.attributes[key] = {}
    for (const [index, def] of Object.entries(schema?.properties || {})) {
      switch ((def as any).type) {
        case 'array':
          data.attributes[key][index] = [];
          break;

        case 'object':
          data.attributes[key][index] = {};
          break;

        case 'number':
          data.attributes[key][index] = 0;
          break;

        default:
          data.attributes[key][index] = '';
          break;
      }
    }
  }
  /**
   * Transform data following schema validation
   * @param key
   * @param attribute
   * @param data
   */
  public async transformAttribute(key: string, attribute: any, data: any) {

    const path = this.resolveConfigPath(key);
    if (path === null) {
      this.logger.error('schema for ' + key + ' does not exist');
      throw new BadRequestException('schema for ' + key + ' does not exist');
    }
    const schema: any = parse(readFileSync(path, 'utf8'));
    this.logger.debug(`Additionalfields object transformation: ${JSON.stringify(data[key])}`);
    for (const [index, def] of Object.entries(schema?.properties || {})) {
      switch ((def as any).type) {
        case 'array':
          if (typeof data[key][index] === 'undefined' || data[key][index] === null) {
            data[key][index] = [];
          }
          if (!(data[key][index] instanceof Array)) {
            data[key][index] = [data[key][index]];
          }
          if (typeof def['items'] !== 'undefined') {
            //test si toutes les valeurs sont du bon type
            for (const elems in data[key][index]) {
              if (typeof data[key][index][elems] !== def['items']['type']) {
                switch (def['items']['type']) {
                  case 'string':
                    data[key][index][elems] = String(data[key][index][elems]);
                    break;
                  case 'number':
                    data[key][index][elems] = await this.transformNumber(data[key][index][elems])
                    break;
                }
              }
            }
          }
          break;
        case 'number':
          if (typeof data[key][index] === 'undefined' || data[key][index] === null) {
            data[key][index] = 0;
          }
          if (typeof data[key][index] !== 'number') {
            //on ne convertit pas si la chaine est vide
            if (typeof data[key][index] === 'string' && data[key][index] !== "") {
              data[key][index] = await this.transformNumber(data[key][index])
            }
          }
          break;
        case 'string':
          if (typeof data[key][index] === 'undefined' || data[key][index] === null) {
            data[key][index] = "";
          }
          if (typeof data[key][index] !== 'string') {
            data[key][index] = String(data[key][index]);
          }
          break;
      }
    }
  }

  /**
   * transform string in number if it is possible
   * @param value
   * @private
   */
  private async transformNumber(value) {
    if (typeof value === 'string') {
      const tr = parseFloat(value)
      if (!isNaN(tr)) {
        return tr
      } else {
        return 0
      }
    }
    return value
  }
  /**
   * Validates additional fields for identities.
   * @param data - The additional fields data to validate.
   * @returns A promise that resolves if validation succeeds, or rejects with validation errors.
   */
  public async validate(data: AdditionalFieldsPart | additionalFieldsPartDto, callException: boolean = true): Promise<object> {
    if (!data.objectClasses) {
      data.objectClasses = [];
    }
    if (!data.attributes) {
      data.attributes = {};
    }
    data.validations = {};

    const objectClasses = data.objectClasses || [];
    const attributes = data.attributes || {};
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
        validations['message'] = `Fichier de config '${key}.yml' introuvable`;
        throw new ValidationConfigException(validations);
      }

      // Check for invalid schema
      this.logger.verbose(`Validating schema ${key}.yml`);
      const schema: ConfigObjectSchemaDTO = parse(readFileSync(path, 'utf8'));
      if (!this.validateSchema(schema)) {
        validations['message'] = `Schema ${key}.yml invalide: ${this.ajv.errorsText(this.validateSchema.errors)}`;
        throw new ValidationConfigException(validations);
      }
      //verification des required, il faut que l'entree soit presente dans les proprietes
      if (schema.hasOwnProperty('required')) {
        for (const required of schema['required']) {
          if (!schema['properties'].hasOwnProperty(required)) {
            validations['message'] = `Schema ${key}.yml invalide : required : ${required} without property`;
            throw new ValidationConfigException(validations);
          }
        }
      }
    }
    // Validate each attribute
    for (const key of attributesKeys) {
      const validationError = await this.validateAttribute(key, attributes[key], attributes);
      if (validationError) {
        validations[key] = validationError;
        reject = true;
      } else {
        delete validations[key];
      }
    }

    if (reject && callException) {
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
  public async validateAttribute(key: string, attribute: any, data: any): Promise<any | null> {
    const path = this.resolveConfigPath(key);
    if (path === null) {
      this.logger.error('schema for ' + key + ' does not exist');
      throw new BadRequestException('schema for ' + key + ' does not exist');
    }
    const schema: any = parse(readFileSync(path, 'utf8'));
    // mise de min length et minItems dans les champs requis
    if (schema.hasOwnProperty('required')) {
      for (const required of schema['required']) {
        switch (schema['properties'][required]['type']) {
          case 'array':
            if (!schema['properties'][required]['minItems']) {
              schema['properties'][required]['minItems'] = 1
            }
            break;
          case 'string':
            if (!schema['properties'][required]['minLength']) {
              schema['properties'][required]['minLength'] = 1
            }
            break;
        }
      }
    }
    for (const [index, def] of Object.entries(schema?.properties || {})) {
      if (typeof data[key][index] === 'undefined' || data[key][index] === null) {
        switch ((def as any).type) {
          case 'array':
            data[key][index] = [];
            break;

          case 'object':
            data[key][index] = {};
            break;

          case 'number':
            data[key][index] = 0;
            break;

          default:
            data[key][index] = '';
            break;
        }
      }
    }

    this.logger.debug(`Additionalfields object validation: ${JSON.stringify(data[key])}`);
    //limitation de la taille du data pour le pb de deny of service de ajv
    //voir (https://ajv.js.org/security.html)
    if (Object.keys(data[key]).length > 500) {
      this.logger.error('Request too large');
      throw new BadRequestException('Request too large');
    }
    const ok = await this.ajv.validate(schema, data[key]);
    if (ok === false) {
      const retErrors = {};
      await this.translateAjv(this.ajv.errors)
      for (const err of this.ajv.errors) {
        retErrors[err['instancePath'].substring(1)] = err['instancePath'].substring(1) + ' ' + err['message']
      }
      return (retErrors)
    }
    return null
  }

  public async findAll(): Promise<any> {
    this.logger.debug(['findAll', JSON.stringify(Object.values({ ...arguments }))].join(' '));
    const hardConfigPath = './src/management/identities/validations/_config';
    const dynamicConfigPath = './configs/identities/validations';
    // Retrieve files from each directory and tag them with their source
    let hardConfigFiles = [];
    try {
      hardConfigFiles = readdirSync(hardConfigPath).map((file) => ({
        file,
        path: hardConfigPath,
        source: 'hardConfig',
      }));
    } catch (error) {
      this.logger.error(`Error reading hard config files: ${error.message}`);
    }

    let dynamicConfigFiles = [];
    try {
      dynamicConfigFiles = readdirSync(dynamicConfigPath).map((file) => ({
        file,
        path: dynamicConfigPath,
        source: 'dynamicConfig',
      }));
    } catch (error) {
      this.logger.error(`Error reading dynamic config files: ${error.message}`);
    }

    // const files = [...hardConfigFiles, ...dynamicConfigFiles];
    const filesMap = new Map();

    for (const target of dynamicConfigFiles) {
      filesMap.set(target.file, target);
    }

    for (const target of hardConfigFiles) {
      if (filesMap.has(target.file)) {
        continue;
      }
      filesMap.set(target.file, target);
    }

    const files = Array.from(filesMap.values());

    const result = [];
    for (const fileObj of files) {
      if (/.yml$/.test(fileObj.file) === false) continue;

      const filePath = `${fileObj.path}/${fileObj.file}`;
      const data = parse(readFileSync(filePath, 'utf-8'));
      const key = fileObj.file.replace('.yml', '');
      result.push({ [key]: data, source: fileObj.source, name: key });
    }
    return [result, files.length];
  }

  public async findOne(schema): Promise<any> {
    this.logger.debug(['findOne', JSON.stringify(Object.values(arguments))].join(' '));
    let filePath = '';
    if (schema === 'inetorgperson') {
      filePath = './validation/inetorgperson.yml';
      if (!existsSync(filePath)) {
        const message = `File not found /validation/inetorgperson.yml`;
        throw new ValidationConfigException({ message });
      }
    } else {
      filePath = this.resolveConfigPath(schema);
      if (!existsSync(filePath)) {
        const message = `File not found: ${filePath}`;
        throw new ValidationConfigException({ message });
      }
    }
    return parse(readFileSync(filePath, 'utf-8'));
  }
  private async translateAjv(messages) {
    switch (this.config.get('application.lang')) {
      case 'en':
        break
      case 'fr':
      case 'fr_FR.UTF-8':
      case 'fr_FR':
        localize.fr(messages)
        break
    }
  }
}

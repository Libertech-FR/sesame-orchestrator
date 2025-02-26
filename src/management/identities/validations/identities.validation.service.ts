import {Injectable, Logger, OnApplicationBootstrap} from '@nestjs/common';
import {parse} from 'yaml';
import {existsSync, readFileSync, readdirSync, writeFileSync} from 'fs';
import {ConfigObjectSchemaDTO} from './_dto/config.dto';
import {diff} from 'radash';
import {AdditionalFieldsPart} from '../_schemas/_parts/additionalFields.part.schema';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import validSchema from './_config/validSchema';
import ajvErrors from 'ajv-errors';
import {ValidationConfigException, ValidationSchemaException} from '~/_common/errors/ValidationException';
import {additionalFieldsPartDto} from '../_dto/_parts/additionalFields.dto';

/**
 * Service responsible for validating identities.
 */
@Injectable()
export class IdentitiesValidationService implements OnApplicationBootstrap {
  private ajv: Ajv = new Ajv({allErrors: true});
  private validateSchema;
  private logger: Logger;

  public constructor() {
    addFormats(this.ajv);
    ajvErrors(this.ajv);
    this.ajv.addFormat('number',/^\d*$/);
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

  public async transform(data: AdditionalFieldsPart | additionalFieldsPartDto): Promise<AdditionalFieldsPart | additionalFieldsPartDto> {
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
    for (const key of attributesKeys) {
      await this.transformAttribute(key, attributes[key], attributes);
    }
    return data
  }

  /**
   * Transform data following schema validation
   * @param key
   * @param attribute
   * @param data
   */
  public async transformAttribute(key: string, attribute: any, data: any) {

    const path = this.resolveConfigPath(key);
    const schema: any = parse(readFileSync(path, 'utf8'));
    this.logger.debug(`Additionalfields object transformation: ${JSON.stringify(data[key])}`);
    for (const [index, def] of Object.entries(schema?.properties || {})) {
      switch ((def as any).type) {
        case 'array':
          if (typeof data[key][index] === 'undefined' || data[key][index] === null) {
            data[key][index] = [];
          }
          if (!(data[key][index] instanceof Array)){
            data[key][index]=[data[key][index]];
          }
          if (typeof def['items'] !== 'undefined') {
              //test si toutes les valeurs sont du bon type
              for(const elems in data[key][index]){
                if (typeof data[key][index][elems] !== def['items']['type']){
                   switch(def['items']['type']){
                     case 'string':
                       data[key][index][elems]=String(data[key][index][elems]);
                       break;
                     case 'number':
                       data[key][index][elems]=await this.transformNumber(data[key][index][elems])
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
          if (typeof data[key][index] !== 'number'){
            //on ne convertit pas si la chaine est vide
            if (typeof data[key][index] === 'string' &&  data[key][index] !== ""){
              data[key][index]=await this.transformNumber(data[key][index])
            }
          }
          break;
        case 'string':
          if (typeof data[key][index] === 'undefined' || data[key][index] === null) {
            data[key][index] = "";
          }
          if (typeof data[key][index] !== 'string'){
            data[key][index]=String(data[key][index]);
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
  private async transformNumber(value){
    if (typeof value === 'string'){
      const tr=parseFloat(value)
      if (! isNaN(tr)){
        return tr
      }else{
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
  public async validate(data: AdditionalFieldsPart | additionalFieldsPartDto): Promise<object> {
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
      throw new ValidationConfigException({validations});
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

    if (reject) {
      throw new ValidationSchemaException({validations});
    }
    return Promise.resolve({message: 'Validation succeeded'});
  }

  /**
   * Validates a single attribute.
   * @param key - The key of the attribute to validate.
   * @param attribute - The attribute value to validate.
   * @returns A promise that resolves with an error message if validation fails, otherwise null.
   */
  public async validateAttribute(key: string, attribute: any, data: any): Promise<any | null> {
    const path = this.resolveConfigPath(key);
    const schema: any = parse(readFileSync(path, 'utf8'));

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
    const ok= await this.ajv.validate(schema,data[key]);
    if (ok === false) {
      const retErrors = {};
      for (const err of this.ajv.errors) {
        retErrors[err['instancePath'].substring(1)]= err['instancePath'].substring(1) + ' ' +  err['message']
      }
      return(retErrors)
    }
    return null
  }

  public async findAll(): Promise<any> {
    this.logger.debug(['findAll', JSON.stringify(Object.values({...arguments}))].join(' '));
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
      result.push({[key]: data, source: fileObj.source, name: key});
    }
    return [result, files.length];
  }

  public async findOne(schema): Promise<any> {
    this.logger.debug(['findOne', JSON.stringify(Object.values(arguments))].join(' '));
    let filePath = '';
    if (schema === 'inetorgperson') {
      filePath = './validation/inetorgperson.json';
      if (!existsSync(filePath)) {
        const message = `File not found /validation/inetorgperson.json`;
        throw new ValidationConfigException({message});
      }
    } else {
      filePath = this.resolveConfigPath(schema);
      if (!existsSync(filePath)) {
        const message = `File not found: ${filePath}`;
        throw new ValidationConfigException({message});
      }
    }
    return parse(readFileSync(filePath, 'utf-8'));
  }
}

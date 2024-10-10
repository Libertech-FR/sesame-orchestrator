import { Injectable, OnApplicationBootstrap, OnModuleInit } from '@nestjs/common';
import { AbstractService } from '~/_common/abstracts/abstract.service';
import { parse, stringify } from 'yaml';
import { existsSync, readFileSync, writeFileSync, readdirSync, readdir } from 'fs';
// import Ajv from 'ajv';
import { ValidationConfigException } from '~/_common/errors/ValidationException';

@Injectable()
export class IdentitiesJsonformsService extends AbstractService implements OnApplicationBootstrap {
  // private ajv: Ajv = new Ajv({ allErrors: true });
  // private validateSchema;

  public constructor() {
    super();
  }

  public onApplicationBootstrap(): void {
    let files = [];
    let defaultFiles = [];

    this.logger.log('Initializing identities jsonforms service');

    try {
      files = readdirSync(`${process.cwd()}/configs/identities/jsonforms`);
      defaultFiles = readdirSync(`${process.cwd()}/src/management/identities/jsonforms/_default`);
    } catch (error) {
      this.logger.error('Error reading identities jsonforms', error.message, error.stack);
    }

    for (const file of defaultFiles) {
      if (!files.includes(file)) {
        try {
          const defaultFile = readFileSync(`${process.cwd()}/src/management/identities/jsonforms/_default/${file}`, 'utf-8');
          writeFileSync(`${process.cwd()}/configs/identities/jsonforms/${file}`, defaultFile);

          this.logger.warn(`Copied default jsonform file: ${file}`);
        } catch (error) {
          this.logger.error(`Error copying default jsonform file: ${file}`, error.message, error.stack);
        }
      }
    }

    this.logger.log('Identities jsonforms service initialized');
  }

  private resolveJsonFormPath(schema: string): string | null {
    if (!schema.endsWith('.yml')) schema += '.yml';
    const hardConfigPath = `./src/management/identities/jsonforms/_config/${schema}`;
    const dynamicConfigPath = `./configs/identities/jsonforms/${schema}`;
    if (existsSync(dynamicConfigPath)) {
      return dynamicConfigPath;
    }
    if (existsSync(hardConfigPath)) {
      return hardConfigPath;
    }
    return null;
  }

  public async generate({ schema, path }): Promise<any> {
    if (schema) {
      console.log(`Generating jsonforms for schema: ${schema}`);
      if (!schema.endsWith('.yml')) schema += '.yml';
      const filePath = `${path}/${schema}`;
      console.log(`File path: ${filePath}`);
      if (!existsSync(filePath)) {
        console.log(`File not found: ${filePath}`);
        const message = `File not found: ${filePath}`;
        throw new ValidationConfigException({ message });
      }

      const jsonSchema = parse(readFileSync(filePath, 'utf-8'));

      // const jsonForm = {
      //   type: 'VerticalLayout',
      //   elements: Object.keys(jsonSchema.properties).map((key) => {
      //     return {
      //       type: 'Control',
      //       label: key,
      //       scope: `#/properties/${key}`,
      //       options: {
      //         required: jsonSchema.required && jsonSchema.required.includes(key),
      //       },
      //     };
      //   }),
      // };

      const jsonForm = {
        type: 'Group',
        label: schema,
        elements: Object.keys(jsonSchema.properties)
          .reduce((acc, key, index) => {
            const groupIndex = Math.floor(index / 3); // Determine the current group based on the index
            if (!acc[groupIndex]) {
              acc[groupIndex] = {
                // Initialize a new HorizontalLayout group if it doesn't exist
                type: 'HorizontalLayout',
                elements: [],
              };
            }

            acc[groupIndex].elements.push({
              // Add the current element to its corresponding group
              type: 'Control',
              label: key,
              scope: `#/properties/${key}`,
              options: {
                required: jsonSchema.required && jsonSchema.required.includes(key),
                showUnfocusedDescription: false,
              },
            });

            return acc;
          }, [])
          .map((group) => group), // Flatten the structure
      };
      if (!schema.endsWith('.ui.yml')) schema = schema.replace('.yml', '.ui.yml');
      const jsonFormPath = `${path.replace('validations', 'jsonforms')}/${schema}`;
      console.log(`Writing jsonform to: ${jsonFormPath}`);
      writeFileSync(`${jsonFormPath}`, stringify(jsonForm));
      return jsonForm;
    }
  }

  public async generateAll(): Promise<any> {
    const hardConfigPath = './src/management/identities/validations/_config';
    const dynamicConfigPath = './configs/identities/validations';

    let hardConfigFiles = [];
    try {
      hardConfigFiles = readdirSync(hardConfigPath).map((file) => ({ schema: file, path: hardConfigPath }));
    } catch (error) {
      console.log(`Error reading hard config files: ${error.message}`);
    }

    let dynamicConfigFiles = [];
    try {
      dynamicConfigFiles = readdirSync(dynamicConfigPath).map((file) => ({
        schema: file,
        path: dynamicConfigPath,
      }));
    } catch (error) {
      console.log(`Error reading dynamic config files: ${error.message}`);
    }

    console.log('Generating jsonforms for all schemas');
    console.log('Hard config files:', hardConfigFiles);
    console.log('Dynamic config files:', dynamicConfigFiles);

    const files = [...hardConfigFiles, ...dynamicConfigFiles].filter((file) => file.schema.endsWith('.yml'));
    for (const file of files) {
      this.generate(file);
    }
    return files.length;
  }

  public async findAll(): Promise<any> {
    const hardConfigPath = './src/management/identities/jsonforms/_config';
    const dynamicConfigPath = './configs/identities/jsonforms';

    let hardConfigFiles = [];
    try {
      hardConfigFiles = readdirSync(hardConfigPath).map((file) => ({ file, path: hardConfigPath }));
    } catch (error) {
      console.log(`Error reading hard config files: ${error.message}`);
    }

    let dynamicConfigFiles = [];
    try {
      dynamicConfigFiles = readdirSync(dynamicConfigPath).map((file) => ({ file, path: dynamicConfigPath }));
    } catch (error) {
      console.log(`Error reading dynamic config files: ${error.message}`);
    }

    const files = [...hardConfigFiles, ...dynamicConfigFiles];
    const result = [];
    for (const fileObj of files) {
      const filePath = `${fileObj.path}/${fileObj.file}`;
      const data = parse(readFileSync(filePath, 'utf-8'));
      const key = fileObj.file.replace('.ui.yml', '');
      result.push({ [key]: data });
    }
    return [result, files.length];
  }

  public async findOne(
    schema: string,
    options?: { mode?: string; employeeType?: string }
  ): Promise<[string, any]> {
    const { mode = 'create', employeeType = '' } = options || {};
    if (schema.endsWith('.yml')) schema = schema.replace('.yml', '');

    const filePaths = [
      `${schema}.${mode}.${employeeType.toLowerCase()}.ui`,
      `${schema}.${mode}.ui`,
      `${schema}.${employeeType.toLowerCase()}.ui`,
      `${schema}.ui`,
    ];

    let finalPath = null;
    const filePath = filePaths.find((path) => {
      const resolved = this.resolveJsonFormPath(path)
      if (!resolved) return null;
      finalPath = resolved;

      return resolved;
    });

    if (!filePath) {
      throw new ValidationConfigException({ message: `File not found: ${schema}.ui.yml` });
    }

    return [filePath, parse(readFileSync(finalPath, 'utf-8'))];
  }
}

import { Injectable } from '@nestjs/common';
import { AbstractService } from '~/_common/abstracts/abstract.service';
import { parse, stringify } from 'yaml';
import { existsSync, readFileSync, writeFileSync, readdirSync } from 'fs';
import Ajv from 'ajv';
import { ValidationConfigException } from '~/_common/errors/ValidationException';

@Injectable()
export class IdentitiesJsonformsService extends AbstractService {
  private ajv: Ajv = new Ajv({ allErrors: true });
  private validateSchema;

  constructor() {
    super();
    //this.validateSchema = this.ajv.compile(validSchema);
  }

  async generate(schema: string): Promise<any> {
    if (schema) {
      console.log(`Generating jsonforms for schema: ${schema}`);
      const filePath = `./src/management/identities/validations/_config/${schema}.yml`;

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

      writeFileSync(`./src/management/identities/jsonforms/_config/${schema}.ui.yml`, stringify(jsonForm));
      return jsonForm;
    }
  }

  async generateAll(): Promise<any> {
    const configPath = './src/management/identities/validations/_config';
    const files = readdirSync(configPath);
    for (const file of files) {
      this.generate(file);
    }
    return files.length;
  }

  async findAll(): Promise<any> {
    this.logger.debug(['findAll', JSON.stringify(Object.values(arguments))].join(' '));
    const configPath = './src/management/identities/jsonforms/_config';
    const files = readdirSync(configPath);
    const result = [];
    for (const file of files) {
      const filePath = `${configPath}/${file}`;
      const data = parse(readFileSync(filePath, 'utf-8'));
      const key = file.replace('.ui.yml', '');
      result.push({ [key]: data });
    }
    return [result, files.length];
  }

  async findOne(schema): Promise<any> {
    this.logger.debug(['findOne', JSON.stringify(Object.values(arguments))].join(' '));
    const filePath = `./src/management/identities/jsonforms/_config/${schema}.ui.yml`;
    if (!existsSync(filePath)) {
      const message = `File not found: ${filePath}`;
      throw new ValidationConfigException({ message });
    }

    return parse(readFileSync(filePath, 'utf-8'));
  }
}

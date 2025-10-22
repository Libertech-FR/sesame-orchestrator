import { ApiProperty } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { IsArray, IsNotEmpty, IsNumber, IsObject, IsOptional, ValidateNested, registerDecorator, ValidationOptions, ValidationArguments, isString, isNumber, IsString } from 'class-validator';
import { IdentityLifecycleDefault } from '~/management/identities/_enums/lifecycle.enum';

/**
 * Transform trigger values to seconds.
 * - Numbers are interpreted as days and converted to seconds
 * - Strings with 'd' suffix are interpreted as days and converted to seconds
 * - Strings with 'm' suffix are interpreted as minutes and converted to seconds
 * - Strings with 's' suffix are already in seconds
 *
 * @param value The trigger value to transform
 * @returns The value converted to seconds
 */
function transformTriggerToSeconds(value: number | string): number | undefined {
  let isValid = false;

  if (value === undefined || value === null) {
    return undefined;
  }

  /**
   * Check if the value is a number.
   * If it's a number, we check if it's upper than 0.
   * If it's a string, we check if it matches the regex for time strings.
   */
  if (isNumber(value)) {
    isValid = value < 0;
  } else if (isString(value)) {
    const timeRegex = /^\d+[dms]$/;
    if (timeRegex.test(value)) {
      // Extract the number part and check if it's
      const numberPart = value.replace(/[dms]$/, '');
      const num = parseInt(numberPart, 10);
      isValid = num > 0;
    }
  }

  if (!isValid) {
    throw new Error('Trigger must be a number (days) or a time string with units (e.g., "90d", "10m", "45s")');
  }

  /**
   * If the value is a number, we assume it's in days and convert it to seconds.
   * We multiply by 24 (hours) * 60 (minutes) * 60 (seconds) to get the total seconds.
   * This conversion preserves the sign of the number,
   * so if the input is negative, the output will also be negative.
   */
  if (isNumber(value)) {
    return value * 24 * 60 * 60; // Convert days to seconds, preserving sign
  }

  /**
   * If the value is a string, we check if it matches the regex for negative time strings.
   * If it does, we extract the number and unit, then convert it to seconds.
   * - 'd' is converted to seconds by multiplying by 24 * 60 * 60
   * - 'm' is converted to seconds by multiplying by 60
   * - 's' is already in seconds
   * This conversion preserves the sign of the number,
   * so if the input is negative, the output will also be negative.
   */
  if (isString(value)) {
    const match = value.match(/^(\d+)([dms])$/);
    if (match) {
      const numValue = parseInt(match[1], 10);
      const unit = match[2];

      switch (unit) {
        case 'd': // days
          return numValue * 24 * 60 * 60;

        case 'm': // minutes
          return numValue * 60;

        case 's': // seconds
          return numValue;

        default:
          throw new Error(`Unsupported time unit: ${unit}`);
      }
    }
  }

  // If we can't parse it, try to convert to number
  return Number(value) || undefined;
}

/**
 * Custom decorator to validate that at least one of the properties 'rules' or 'trigger' is defined and not empty.
 * This decorator can be applied to a class to enforce this validation rule.
 *
 * @param validationOptions
 * @returns
 */
function ValidateRulesOrTrigger(validationOptions?: ValidationOptions) {
  return function (constructor: Function) {
    registerDecorator({
      name: 'validateRulesOrTrigger',
      target: constructor,
      propertyName: undefined,
      options: validationOptions,
      validator: {
        validate(_: any, args: ValidationArguments) {
          const obj = args.object as ConfigRulesObjectIdentitiesDTO;

          /**
           * Check if either 'rules' or 'trigger' is defined and not empty.
           * 'rules' should be an object with at least one key-value pair,
           * and 'trigger' should be a number that is not null.
           */
          const hasRules = obj.rules !== undefined && obj.rules !== null && (typeof obj.rules === 'object' && Object.keys(obj.rules).length > 0);
          const hasTrigger = obj.trigger !== undefined && obj.trigger !== null;
          return hasRules || hasTrigger;
        },
        defaultMessage(_: ValidationArguments) {
          return 'Either rules or trigger must be provided';
        }
      }
    });
  };
}

@ValidateRulesOrTrigger({ message: 'Either rules or trigger must be provided' })
export class ConfigRulesObjectIdentitiesDTO {
  @ApiProperty({
    type: String,
    enum: IdentityLifecycleDefault,
    description: 'Lifecycle state of the identity',
    example: IdentityLifecycleDefault.OFFICIAL,
    required: true,
  })
  public sources: IdentityLifecycleDefault[];

  @IsOptional()
  @IsString()
  public dateKey: string = 'lastLifecycleUpdate';

  @IsOptional()
  @IsObject()
  public rules: object;

  @IsOptional()
  @IsObject()
  public mutation: object;

  @IsOptional()
  @Transform(({ value }) => transformTriggerToSeconds(value))
  @IsNumber()
  @ApiProperty({
    oneOf: [
      { type: 'number', description: 'Number representing days' },
      { type: 'string', description: 'Time string with units (d=days, m=minutes, s=seconds)' }
    ],
    required: false,
    description: 'Trigger time as number (days) or time string with units',
    examples: [90, '90d', '10m', '45s']
  })
  public trigger: number;

  @IsNotEmpty()
  @ApiProperty({
    type: String,
    enum: IdentityLifecycleDefault,
    description: 'Target lifecycle state for the identity',
    example: IdentityLifecycleDefault.MANUAL,
    required: true,
  })
  public target: IdentityLifecycleDefault;
}

export class ConfigRulesObjectSchemaDTO {
  @IsOptional()
  @IsArray()
  @ApiProperty({
    type: ConfigRulesObjectIdentitiesDTO,
    required: false,
  })
  @ValidateNested({ each: true })
  @Type(() => ConfigRulesObjectIdentitiesDTO)
  public identities: ConfigRulesObjectIdentitiesDTO[]
}

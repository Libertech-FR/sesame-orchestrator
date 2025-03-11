import { Injectable } from '@nestjs/common'
import { InjectConnection } from '@nestjs/mongoose'
import {
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  registerDecorator,
} from 'class-validator'
import { Connection } from 'mongoose'
import { get } from 'radash'

@ValidatorConstraint({ name: 'UniquenessMailValidator', async: true })
@Injectable()
export class UniquenessMailValidator implements ValidatorConstraintInterface {
  public constructor(@InjectConnection() private connection: Connection) { }
  public async validate(
    value: any,
    args?: ValidationArguments
  ): Promise<boolean> {
    for (const contraint of args.constraints) {
      const $ne = get(args.object, contraint.primaryKey)
      const val = get(value, contraint.key)
      const count = await this.connection.collection(contraint.collection).countDocuments({
        [contraint.primaryKey]: { $ne },
        [contraint.key]: val,
      })

      console.log('count', count)
      console.log('debug', {
        [contraint.primaryKey]: { $ne },
        [contraint.key]: val,
      })

      if (count > 0) {
        return false
      }
    }

    return true
  }

  defaultMessage(validationArguments?: ValidationArguments): string {
    // return custom field message
    const field: string = validationArguments.property
    return `${field} is already exist`
  }
}

export type UniquenessMailInterface = {
  collection: string
  primaryKey: string
  key: string
}

export function isUnique(options: UniquenessMailInterface, validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: 'isUnique',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [options],
      validator: UniquenessMailValidator,
    })
  }
}

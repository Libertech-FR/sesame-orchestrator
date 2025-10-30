import { HttpException } from '@nestjs/common';
import { ValidationExceptionPayload } from '~/_common/types/validation-exception-payload.type';

const DEFAULT_STATUS_CODE = 400;
const DEFAULT_MESSAGE = 'Validation failed';
const DEFAULT_VALIDATIONS: Record<string, string> = {};

export class ValidationException extends HttpException {
  private readonly validations: Record<string, string>;

  constructor(payload: ValidationExceptionPayload) {
    const { message, validations, statusCode } = payload;
    super(message || DEFAULT_MESSAGE, statusCode || DEFAULT_STATUS_CODE);
    this.name = this.constructor.name;
    this.validations = validations || DEFAULT_VALIDATIONS;
  }

  getValidations(): Record<string, string> {
    return this.validations;
  }

  getPayload(): ValidationExceptionPayload {
    return {
      message: this.message,
      statusCode: this.getStatus(),
      validations: this.validations,
    };
  }
}

export class ValidationSchemaException extends ValidationException {
  constructor(payload: ValidationExceptionPayload) {
    payload.message = payload.message || 'Wrong schema validation';
    super(payload);
  }
}

export class ValidationConfigException extends ValidationException {
  constructor(payload: ValidationExceptionPayload) {
    payload.message = payload.message || 'Wrong config validation';
    super(payload);
  }
}

import { HttpException } from '@nestjs/common';

export class ValidationException extends HttpException {
  constructor(message, statusCode = 400) {
    super(message, statusCode);
    this.name = this.constructor.name;
    this.getStatus = () => statusCode;
  }
}

export class ValidationSchemaException extends ValidationException {}

export class ValidationConfigException extends ValidationException {}

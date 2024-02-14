import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common';
import { ValidationException } from '~/_common/errors/ValidationException';
import { Response } from 'express';

@Catch(ValidationException)
export class IdentitiesValidationFilter implements ExceptionFilter {
  catch(exception: ValidationException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();

    Logger.debug(exception['message'], 'IdentitiesValidationFilter');

    return response.status(status).json({
      statusCode: status,
      message: exception.message,
      validations: exception.getValidations(),
    });
  }
}

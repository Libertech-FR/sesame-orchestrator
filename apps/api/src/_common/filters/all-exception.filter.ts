import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common';
import { Response } from 'express';
@Catch()
export class AllExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    Logger.debug(exception['message'], 'AllExceptionFilter');

    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = 500;

    return response.status(status).json({
      statusCode: status,
      message: exception['message'] || exception['name'] || 'Internal server error',
    });
  }
}

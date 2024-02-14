import { HttpStatus } from '@nestjs/common';

export type ValidationExceptionPayload = {
  message?: string;
  statusCode?: HttpStatus;
  validations?: Record<string, string>;
};

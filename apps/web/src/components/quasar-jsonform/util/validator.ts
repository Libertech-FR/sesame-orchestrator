import type { Options } from 'ajv';
import { createAjv as createAjvCore } from '@jsonforms/core';
import Ajv from 'ajv';

export const createAjv = (options?: Options): Ajv => {
  const ajv = createAjvCore(options);
  debugger
  ajv.addFormat('password', (_) => true);
  return ajv;
};

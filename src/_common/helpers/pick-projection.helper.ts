import { Type } from '@nestjs/common';

/* eslint-disable */
export function PickProjectionHelper<T, _K extends keyof T>(
  classRef: Type<T>,
  _projection: {
    [key in keyof T]?: number | 1 | 0;
  },
): Type<T> {
  //TODO: fix to use projection with pick or partial
  return classRef;
}
/* eslint-enable */

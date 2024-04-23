import { INestApplicationContext } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core/injector/module-ref';
import { ContextIdFactory } from '@nestjs/core';

// eslint-disable-next-line
export const seedRequestContextId = <T extends { user?: any }>(app: INestApplicationContext | ModuleRef, req?: T) => {
  const contextId = ContextIdFactory.create();
  app.registerRequestByContextId(
    {
      ...req,
      user: {
        _id: '000000000000000000000000',
        ...req?.user,
      },
    },
    contextId,
  );
  return contextId;
};

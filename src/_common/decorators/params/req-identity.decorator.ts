import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AgentType } from '~/_common/types/agent.type';

export const ReqIdentity = createParamDecorator((_data: unknown, ctx: ExecutionContext): AgentType => {
  const request = ctx.switchToHttp().getRequest();
  return request.user;
});

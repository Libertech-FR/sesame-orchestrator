import { applyDecorators, SetMetadata } from '@nestjs/common';

export const META_REQUIRE_MFA = 'require-mfa';
export const RequireMfa = () => applyDecorators(SetMetadata(META_REQUIRE_MFA, true));

// @CurrentUser() — 컨트롤러 핸들러에서 타입 안전한 user 추출.
// JwtSupabaseGuard 통과 후에만 사용. Guard 없이 호출되면 즉시 throw (사일런트 버그 차단).
import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import type { AuthUser } from './auth.types';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const req = ctx.switchToHttp().getRequest<Request>();
    if (!req.user) {
      throw new UnauthorizedException(
        'AUTH_GUARD_MISSING: @CurrentUser requires JwtSupabaseGuard',
      );
    }
    return req.user;
  },
);

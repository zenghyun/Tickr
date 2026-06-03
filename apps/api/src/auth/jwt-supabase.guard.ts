// Supabase Access Token(JWT) 검증 Guard.
// alg에 따라 분기: ES256/RS256(신규 비대칭 서명 키) → JWKS 검증,
//                  HS256(레거시 공유 시크릿)      → SUPABASE_JWT_SECRET 대칭 검증.
// issuer/audience 강제로 다른 프로젝트 토큰 거부. 토큰 본문은 로그에 절대 출력 안 함.
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import {
  createRemoteJWKSet,
  decodeProtectedHeader,
  errors as joseErrors,
  jwtVerify,
  type JWTVerifyGetKey,
} from 'jose';
import type { Env } from '../config/env.validation';
import type { AuthUser } from './auth.types';

@Injectable()
export class JwtSupabaseGuard implements CanActivate {
  private readonly logger = new Logger(JwtSupabaseGuard.name);
  // jwtVerify는 Uint8Array 요구. 매 요청마다 인코딩하면 GC 부담 — 1회 캐싱.
  private readonly secret: Uint8Array;
  private readonly issuer: string;
  // 신규 Supabase 프로젝트는 ES256 비대칭 키로 토큰 서명. JWKS endpoint에서
  // 공개키를 받아 검증 — createRemoteJWKSet이 내부적으로 키 캐시/회전을 처리.
  private readonly jwks: JWTVerifyGetKey;

  constructor(private readonly config: ConfigService<Env, true>) {
    const raw = this.config.get('SUPABASE_JWT_SECRET', { infer: true });
    this.secret = new TextEncoder().encode(raw);
    // Supabase JWT iss = `${SUPABASE_URL}/auth/v1`. URL trailing slash 정규화.
    const url = this.config.get('SUPABASE_URL', { infer: true });
    this.issuer = `${url.replace(/\/$/, '')}/auth/v1`;
    this.jwks = createRemoteJWKSet(
      new URL(`${this.issuer}/.well-known/jwks.json`),
    );
  }

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request>();
    const header = req.headers.authorization;

    if (!header) {
      throw new UnauthorizedException(
        'MISSING_TOKEN: Authorization header is required',
      );
    }
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException(
        'MALFORMED_TOKEN: expected "Bearer <token>"',
      );
    }

    try {
      // 토큰 헤더의 alg로 검증 키를 선택한다.
      // - ES256/RS256: 비대칭(신규 Supabase 서명 키) → JWKS 공개키
      // - HS256:       대칭(레거시 공유 시크릿)       → SUPABASE_JWT_SECRET
      // alg=none / 알 수 없는 alg는 화이트리스트에서 자동 거부.
      const { alg } = decodeProtectedHeader(token);
      const isAsymmetric = alg === 'ES256' || alg === 'RS256';
      const verifyOptions = {
        algorithms: isAsymmetric ? ['ES256', 'RS256'] : ['HS256'],
        issuer: this.issuer,
        audience: 'authenticated', // Supabase 기본 aud
        clockTolerance: 5, // NTP drift 흡수
      };
      const { payload } = isAsymmetric
        ? await jwtVerify(token, this.jwks, verifyOptions)
        : await jwtVerify(token, this.secret, verifyOptions);

      // payload.sub는 string | undefined. 타입 가드로 안전 확인 (as 단언 금지).
      if (typeof payload.sub !== 'string') {
        throw new UnauthorizedException('INVALID_TOKEN: missing sub claim');
      }

      const user: AuthUser = {
        id: payload.sub,
        email: typeof payload.email === 'string' ? payload.email : undefined,
        role: typeof payload.role === 'string' ? payload.role : undefined,
      };
      req.user = user;
      return true;
    } catch (err) {
      // 이미 UnauthorizedException이면 그대로 throw
      if (err instanceof UnauthorizedException) throw err;

      if (err instanceof joseErrors.JWTExpired) {
        throw new UnauthorizedException('TOKEN_EXPIRED: token has expired');
      }
      if (err instanceof joseErrors.JWTClaimValidationFailed) {
        // 정보 누설 최소화: 어떤 claim이 실패했는지는 warn 로그에만.
        this.logger.warn(`JWT claim validation failed: ${err.claim}`);
        throw new UnauthorizedException(
          'INVALID_TOKEN: claim validation failed',
        );
      }
      if (err instanceof joseErrors.JWSSignatureVerificationFailed) {
        throw new UnauthorizedException('INVALID_TOKEN: signature mismatch');
      }
      if (err instanceof joseErrors.JOSEError) {
        throw new UnauthorizedException('INVALID_TOKEN: malformed JWT');
      }
      // 알 수 없는 에러 — 토큰 본문은 절대 로깅 X.
      this.logger.error(
        'Unexpected JWT verification error',
        err instanceof Error ? err.stack : err,
      );
      throw new UnauthorizedException('INVALID_TOKEN');
    }
  }
}

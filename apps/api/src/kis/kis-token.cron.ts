// KIS 토큰 선제 갱신 cron.
// 매 5분마다 활성 env 캐시를 검사 — 만료 10분 이내면 single-flight refresh 트리거.
//
// cron 실패는 swallow + log.error. 5분 후 다음 주기에 자동 재시도 — exponential backoff 불필요
// (만료 10분 전부터 검사하므로 최대 2~3회 재시도 기회 확보).
//
// 활성 env(KIS_USE_MOCK 기반)만 회전 — 베타는 mock 단독. live 키가 미존재할 수 있어 안전.

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { KisTokenService } from './kis-token.service';
import { TOKEN_WINDOW_MS } from './kis-token.types';

@Injectable()
export class KisTokenCron {
  private readonly logger = new Logger(KisTokenCron.name);

  constructor(private readonly tokenService: KisTokenService) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async refreshIfExpiringSoon(): Promise<void> {
    const env = this.tokenService.getEnv();
    const cached = this.tokenService.getCachedToken(env);

    // 콜드 직후 cron이 onModuleInit 완료 전에 발화하는 경우는 NestJS 라이프사이클상
    // 발생하지 않지만 방어적으로 처리 — cache miss면 ensureFresh로 즉시 보강.
    if (!cached) {
      this.logger.warn(`window check: env=${env} cache=miss — forcing refresh`);
      try {
        await this.tokenService.ensureFresh(env);
      } catch (err) {
        this.logger.error(
          `cron refresh failed (cache miss): env=${env} ${err instanceof Error ? err.message : String(err)}`,
        );
      }
      return;
    }

    const remainingMs = cached.expiresAt.getTime() - Date.now();
    const expiringSoon = this.tokenService.isExpiringSoon(
      cached,
      TOKEN_WINDOW_MS.CRON,
    );

    if (!expiringSoon) {
      this.logger.debug(
        `skip (token still valid): env=${env} remaining_ms=${remainingMs.toLocaleString()}`,
      );
      return;
    }

    this.logger.log(
      `window check: env=${env} remaining_ms=${remainingMs.toLocaleString()} expiring_soon=true`,
    );
    try {
      await this.tokenService.ensureFresh(env);
      this.logger.log('refreshed by cron');
    } catch (err) {
      // 다음 주기(5분 후) 자동 재시도 — throw하지 않음
      this.logger.error(
        `cron refresh failed: env=${env} ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}

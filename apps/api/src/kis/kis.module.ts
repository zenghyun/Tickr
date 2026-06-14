// KIS 인프라 모듈 — 토큰 lifecycle 관리.
// SupabaseModule은 @Global이라 imports 불필요 (SupabaseService를 DI로 직접 inject).
// ScheduleModule.forRoot()는 AppModule에서 글로벌 등록 — 여기선 cron provider만.
//
// exports: KisTokenService(W6 WsHub), KisRestService(W5 QuoteService·W7 체결 MARKET),
//          KisWsClient(W6 WsHub — on('tick')/subscribe/unsubscribe).

import { Module } from '@nestjs/common';
import { KisRateLimiter } from './kis-rate-limiter';
import { KisRestService } from './kis-rest.service';
import { KisTokenCron } from './kis-token.cron';
import { KisTokenService } from './kis-token.service';
import { KisWsClient } from './kis-ws.client';

@Module({
  providers: [
    KisTokenService,
    KisTokenCron,
    KisRestService,
    KisRateLimiter,
    KisWsClient,
  ],
  exports: [KisTokenService, KisRestService, KisWsClient],
})
export class KisModule {}

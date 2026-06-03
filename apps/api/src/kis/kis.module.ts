// KIS 인프라 모듈 — 토큰 lifecycle 관리.
// SupabaseModule은 @Global이라 imports 불필요 (SupabaseService를 DI로 직접 inject).
// ScheduleModule.forRoot()는 AppModule에서 글로벌 등록 — 여기선 cron provider만.
//
// exports: KisTokenService(W6 WsHub), KisRestService(W5 QuoteService·W7 체결 MARKET).

import { Module } from '@nestjs/common';
import { KisRestService } from './kis-rest.service';
import { KisTokenCron } from './kis-token.cron';
import { KisTokenService } from './kis-token.service';

@Module({
  providers: [KisTokenService, KisTokenCron, KisRestService],
  exports: [KisTokenService, KisRestService],
})
export class KisModule {}

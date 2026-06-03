// KIS 인프라 모듈 — 토큰 lifecycle 관리.
// SupabaseModule은 @Global이라 imports 불필요 (SupabaseService를 DI로 직접 inject).
// ScheduleModule.forRoot()는 AppModule에서 글로벌 등록 — 여기선 cron provider만.
//
// exports: KisTokenService — W4 후속 KisRestService, W6 WsHub가 inject.

import { Module } from '@nestjs/common';
import { KisTokenCron } from './kis-token.cron';
import { KisTokenService } from './kis-token.service';

@Module({
  providers: [KisTokenService, KisTokenCron],
  exports: [KisTokenService],
})
export class KisModule {}

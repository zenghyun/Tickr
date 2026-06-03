// quote 도메인 모듈 — 현재가/캔들 엔드포인트 노출.
//
// 의존:
// - KisModule  → KisRestService (KIS REST 호출)
// - AuthModule → JwtSupabaseGuard (양쪽 라우트 보호)
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { KisModule } from '../kis/kis.module';
import { QuoteCache } from './quote.cache';
import { QuoteController } from './quote.controller';
import { QuoteService } from './quote.service';

@Module({
  imports: [KisModule, AuthModule],
  controllers: [QuoteController],
  providers: [QuoteService, QuoteCache],
})
export class QuoteModule {}

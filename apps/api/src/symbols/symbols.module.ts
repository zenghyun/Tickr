// symbols 도메인 모듈. 검색·상세 엔드포인트 노출.
//
// 의존:
// - SupabaseModule → SupabaseService (service_role 클라이언트)
// - AuthModule     → JwtSupabaseGuard (양쪽 라우트 보호)
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { SymbolsController } from './symbols.controller';
import { SymbolsService } from './symbols.service';

@Module({
  imports: [SupabaseModule, AuthModule],
  controllers: [SymbolsController],
  providers: [SymbolsService],
})
export class SymbolsModule {}

// service_role Supabase 클라이언트 전역 노출.
// 다른 모듈(auth/trade/quote/...)이 imports 없이 inject 가능하도록 @Global().
import { Global, Module } from '@nestjs/common';
import { SupabaseService } from './supabase.service';

@Global()
@Module({
  providers: [SupabaseService],
  exports: [SupabaseService],
})
export class SupabaseModule {}

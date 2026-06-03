import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { join } from 'node:path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { validateEnv } from './config/env.validation';
import { KisModule } from './kis/kis.module';
import { QuoteModule } from './quote/quote.module';
import { SupabaseModule } from './supabase/supabase.module';
import { SymbolsModule } from './symbols/symbols.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // __dirname 기준 모노레포 루트 .env. dev(apps/api/src/) / build(apps/api/dist/) 모두 3단계 위.
      // process.cwd() fallback — 모노레포 루트에서 `pnpm dev` 시 첫 후보로 잡힘.
      envFilePath: [
        join(__dirname, '..', '..', '..', '.env'),
        join(process.cwd(), '.env'),
      ],
      // test 환경에서는 .env 무시 — e2e가 process.env에 직접 주입한 값 사용.
      // (envFilePath의 dev .env가 test의 TEST_SECRET을 덮어쓰는 문제 회피)
      ignoreEnvFile: process.env.NODE_ENV === 'test',
      validate: validateEnv,
      cache: true,
    }),
    // 글로벌 cron 레지스트리 — KisTokenCron + 후속 SymbolsMasterCron 등 공유.
    ScheduleModule.forRoot(),
    SupabaseModule,
    AuthModule,
    KisModule,
    SymbolsModule,
    QuoteModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

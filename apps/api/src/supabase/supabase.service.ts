// service_role 권한 Supabase 클라이언트 싱글톤.
// 서버는 stateless — persistSession/autoRefreshToken 둘 다 false.
// RLS 우회로 admin 작업 수행 (체결 RPC, 가입 부트스트랩 등).
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import type { Env } from '../config/env.validation';

// SupabaseClient의 default generic과 createClient 추론 generic이 미묘하게 달라 타입 mismatch가 남.
// 추론에 맡기는 게 가장 안전.
type SbClient = ReturnType<typeof createClient>;

@Injectable()
export class SupabaseService implements OnModuleInit {
  private readonly logger = new Logger(SupabaseService.name);
  // onModuleInit이 부팅 시 보장. ConfigService 주입 후 client 생성 순서가 NestJS 라이프사이클로 보장됨.
  private client!: SbClient;

  constructor(private readonly config: ConfigService<Env, true>) {}

  onModuleInit(): void {
    const url = this.config.get('SUPABASE_URL', { infer: true });
    const serviceRole = this.config.get('SUPABASE_SERVICE_ROLE_KEY', {
      infer: true,
    });

    this.client = createClient(url, serviceRole, {
      auth: {
        // 서버는 stateless. 사용자별 세션 흉내내면 보안 사고 가능성.
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    this.logger.log('Supabase service_role client initialized');
  }

  getClient(): SbClient {
    return this.client;
  }
}

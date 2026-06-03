// service_role 권한 Supabase 클라이언트 싱글톤.
// 서버는 stateless — persistSession/autoRefreshToken 둘 다 false.
// RLS 우회로 admin 작업 수행 (체결 RPC, 가입 부트스트랩 등).
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import ws from 'ws';
import type { Env } from '../config/env.validation';
import type { Database } from './database.types';

// Database generic 주입으로 .from('symbols')/.rpc('search_symbols') 호출의
// args/return을 strict 추론. 새 테이블/RPC 추가 시 database.types.ts 함께 갱신.
type SbClient = SupabaseClient<Database>;

// createClient 옵션의 realtime.transport 타입 — @supabase/realtime-js를 직접
// import하지 않고 옵션 시그니처에서 파생 (의존 결합 회피).
type SupabaseTransport = NonNullable<
  NonNullable<Parameters<typeof createClient>[2]>['realtime']
>['transport'];

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

    this.client = createClient<Database>(url, serviceRole, {
      auth: {
        // 서버는 stateless. 사용자별 세션 흉내내면 보안 사고 가능성.
        persistSession: false,
        autoRefreshToken: false,
      },
      // Node.js 20은 native WebSocket 없음 — ws 패키지를 transport로 주입.
      // ws의 생성자 시그니처가 Supabase의 WebSocketLikeConstructor와 미묘히 달라
      // createClient 옵션에서 transport 타입을 파생해 캐스트 (any 회피).
      realtime: { transport: ws as unknown as SupabaseTransport },
    });
    this.logger.log('Supabase service_role client initialized');
  }

  getClient(): SbClient {
    return this.client;
  }
}

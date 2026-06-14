// KIS OpenAPI access_token 캐시 + 발급 진입점.
//
// 캐시 계층: 메모리(Map) → Postgres(kis_tokens) → KIS REST(/oauth2/tokenP)
// - onModuleInit: DB에서 hydrate, 만료 임박이면 즉시 refresh (fail-fast).
// - getToken:     hot path. 만료 1분 이내일 때만 ensureFresh.
// - ensureFresh:  single-flight Map<env, Promise>로 동시 호출 시 KIS 1회만.
// - cron(별도):   만료 10분 전 선제 갱신.
//
// 비밀(access_token, app_secret) 로깅 금지 — maskToken/maskKey 헬퍼 사용.
// 만료 계산은 항상 `expires_in`(초) 기반 — `access_token_token_expired`(KST) 미사용.
//
// 참고: docs/PLAN.md E절, .claude/rules/trade-rpc.md(service_role mutation 패턴).

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError, type AxiosResponse } from 'axios';
import type { KisApprovalResponse, KisTokenResponse } from '@tickr/shared';
import type { Env } from '../config/env.validation';
import { SupabaseService } from '../supabase/supabase.service';
import {
  KIS_BASE_URL,
  KIS_EXPIRES_IN_MIN_SEC,
  TOKEN_WINDOW_MS,
  type CachedToken,
  type KisApprovalRequestBody,
  type KisEnv,
  type KisTokenRequestBody,
  type KisTokenRow,
} from './kis-token.types';

/** 토큰 마스킹 — 로그에 비밀 노출 금지 */
const maskToken = (t: string): string =>
  t.length < 12 ? '***' : `${t.slice(0, 4)}***${t.slice(-4)}`;

/** App Key/Secret 마스킹 — 앞 4자만 노출, 길이 정보도 노출 금지 */
const maskKey = (k: string): string =>
  k.length < 8 ? '***' : `${k.slice(0, 4)}***`;

@Injectable()
export class KisTokenService implements OnModuleInit {
  private readonly logger = new Logger(KisTokenService.name);
  private readonly cache = new Map<KisEnv, CachedToken>();
  private readonly inflight = new Map<KisEnv, Promise<string>>();

  // WS approval_key: REST 토큰과 별개 발급(POST /oauth2/Approval).
  // 응답에 만료 정보가 없어 세션 단위 장기 유효 — 메모리 캐시만(DB 영속 X).
  // 재발급은 WS 재연결 반복 실패 시 invalidateApprovalKey()로 강제.
  private approvalKey: string | null = null;
  private approvalInflight: Promise<string> | null = null;

  // onModuleInit이 부팅 시 1회 세팅. 이후 immutable.
  private env!: KisEnv;
  private baseUrl!: string;
  private appKey!: string;
  private appSecret!: string;

  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly supabase: SupabaseService,
  ) {}

  // -------------------------------------------------------------------------
  // lifecycle
  // -------------------------------------------------------------------------
  async onModuleInit(): Promise<void> {
    const useMock = this.config.get('KIS_USE_MOCK', { infer: true });
    this.env = useMock ? 'mock' : 'live';
    this.baseUrl = KIS_BASE_URL[this.env];
    this.appKey = this.config.get('KIS_APP_KEY', { infer: true });
    this.appSecret = this.config.get('KIS_APP_SECRET', { infer: true });

    this.logger.log(
      `init env=${this.env} baseUrl=${this.baseUrl} appKey=${maskKey(this.appKey)}`,
    );

    // 1) DB hydrate
    const hydrated = await this.hydrateFromDb(this.env);
    if (hydrated && !this.isExpiringSoon(hydrated, TOKEN_WINDOW_MS.GET_TOKEN)) {
      this.cache.set(this.env, hydrated);
      const remainingMs = hydrated.expiresAt.getTime() - Date.now();
      this.logger.log(
        `hydrated from db: env=${this.env} expires_at=${hydrated.expiresAt.toISOString()} remaining_ms=${remainingMs.toLocaleString()}`,
      );
      return;
    }

    // 2) DB miss 또는 만료 임박 → 즉시 refresh. 실패 시 throw (fail-fast).
    this.logger.log(
      `cold init: env=${this.env} reason=${hydrated ? 'stale' : 'db-miss'} — fetching from KIS`,
    );
    await this.ensureFresh(this.env);
  }

  // -------------------------------------------------------------------------
  // public — 다른 모듈(QuoteService, WsHub 등)이 inject
  // -------------------------------------------------------------------------

  /**
   * 활성 env의 유효한 KIS access_token 반환.
   * 만료 1분 이내일 때만 KIS API를 호출 (single-flight).
   */
  async getToken(): Promise<string> {
    const cached = this.cache.get(this.env);
    if (cached && !this.isExpiringSoon(cached, TOKEN_WINDOW_MS.GET_TOKEN)) {
      return cached.accessToken;
    }
    return this.ensureFresh(this.env);
  }

  /** KIS REST base URL (axios baseURL용) */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /** 현재 활성 env (로깅/디버깅용) */
  getEnv(): KisEnv {
    return this.env;
  }

  /**
   * KIS 실시간 WS 인증용 approval_key 반환 (KisWsClient가 inject).
   * 메모리 캐시 + single-flight — 동시 호출 시 KIS는 1회만 호출.
   * REST access_token과 별개이며 WS 구독 메시지 header.approval_key에 사용.
   */
  async getApprovalKey(): Promise<string> {
    if (this.approvalKey) return this.approvalKey;
    if (this.approvalInflight) return this.approvalInflight;

    this.approvalInflight = this.fetchApprovalKey()
      .then((key) => {
        this.approvalKey = key;
        return key;
      })
      .finally(() => {
        this.approvalInflight = null;
      });
    return this.approvalInflight;
  }

  /**
   * approval_key 캐시 무효화 — 다음 getApprovalKey()가 재발급.
   * KIS WS 인증 거부/재연결 반복 실패 시 KisWsClient가 호출.
   */
  invalidateApprovalKey(): void {
    this.approvalKey = null;
  }

  // -------------------------------------------------------------------------
  // package-private — KisTokenCron 전용
  // -------------------------------------------------------------------------

  /** Cron이 만료 임박 검사용으로 사용. miss 시 null. */
  getCachedToken(env: KisEnv = this.env): CachedToken | null {
    return this.cache.get(env) ?? null;
  }

  /**
   * single-flight refresh. 같은 env에 동시 호출이 와도 KIS는 1회만 호출.
   * 실패 시 inflight를 비우고 reject 전파 — 다음 호출은 새 inflight 시작.
   */
  async ensureFresh(env: KisEnv = this.env): Promise<string> {
    const existing = this.inflight.get(env);
    if (existing) return existing;

    const promise = this.refresh(env).finally(() => {
      this.inflight.delete(env);
    });
    this.inflight.set(env, promise);
    return promise;
  }

  /** 만료 임박 여부 — 윈도우(ms) 이내면 true. cron/getToken이 공유. */
  isExpiringSoon(token: CachedToken, windowMs: number): boolean {
    return token.expiresAt.getTime() - Date.now() < windowMs;
  }

  // -------------------------------------------------------------------------
  // private
  // -------------------------------------------------------------------------

  private async refresh(env: KisEnv): Promise<string> {
    this.logger.log(`refresh start: env=${env}`);
    let response: KisTokenResponse;
    try {
      response = await this.fetchFromKis(env);
    } catch (err) {
      this.logger.error(`refresh fail: env=${env} ${this.describeError(err)}`);
      throw err;
    }

    if (response.expires_in < KIS_EXPIRES_IN_MIN_SEC) {
      throw new Error(
        `KIS expires_in invalid: ${response.expires_in}s (env=${env})`,
      );
    }

    // upsert 먼저 — DB 일관성 우선. upsert 실패하면 메모리도 set 안 함.
    const expiresAt = new Date(Date.now() + response.expires_in * 1000);
    await this.persist(env, response.access_token, expiresAt);

    const cached: CachedToken = {
      accessToken: response.access_token,
      expiresAt,
      updatedAt: new Date(),
    };
    this.cache.set(env, cached);

    this.logger.log(
      `refresh ok: env=${env} token=${maskToken(response.access_token)} expires_in=${response.expires_in}`,
    );
    return response.access_token;
  }

  private async fetchFromKis(env: KisEnv): Promise<KisTokenResponse> {
    const baseUrl = KIS_BASE_URL[env];
    const body: KisTokenRequestBody = {
      grant_type: 'client_credentials',
      appkey: this.appKey,
      appsecret: this.appSecret,
    };
    const res = await axios.post<KisTokenResponse>(
      `${baseUrl}/oauth2/tokenP`,
      body,
      {
        timeout: 10_000,
        headers: { 'Content-Type': 'application/json' },
      },
    );
    return res.data;
  }

  private async fetchApprovalKey(): Promise<string> {
    this.logger.log(`approval_key fetch start: env=${this.env}`);
    const body: KisApprovalRequestBody = {
      grant_type: 'client_credentials',
      appkey: this.appKey,
      secretkey: this.appSecret,
    };
    let res: AxiosResponse<KisApprovalResponse>;
    try {
      res = await axios.post<KisApprovalResponse>(
        `${this.baseUrl}/oauth2/Approval`,
        body,
        { timeout: 10_000, headers: { 'Content-Type': 'application/json' } },
      );
    } catch (err) {
      this.logger.error(
        `approval_key fetch fail: env=${this.env} ${this.describeError(err)}`,
      );
      throw err;
    }

    const key = res.data.approval_key;
    if (!key) {
      throw new Error(`KIS approval_key empty (env=${this.env})`);
    }
    this.logger.log(
      `approval_key fetch ok: env=${this.env} key=${maskToken(key)}`,
    );
    return key;
  }

  private async hydrateFromDb(env: KisEnv): Promise<CachedToken | null> {
    const client = this.supabase.getClient();
    const { data, error } = await client
      .from('kis_tokens')
      .select('env, access_token, expires_at, updated_at')
      .eq('env', env)
      .maybeSingle<KisTokenRow>();

    if (error) {
      this.logger.warn(`hydrate from db failed: env=${env} ${error.message}`);
      return null;
    }
    if (!data) return null;

    return {
      accessToken: data.access_token,
      expiresAt: new Date(data.expires_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  private async persist(
    env: KisEnv,
    accessToken: string,
    expiresAt: Date,
  ): Promise<void> {
    const client = this.supabase.getClient();
    // supabase-js v2는 Database generic 미지정 시 row를 `never`로 추론 — upsert payload 타입 강제 필요.
    // Database 타입 도입(`supabase gen types`)은 별도 이슈(W3+) — 도입 시 이 cast 제거.
    const payload = {
      env,
      access_token: accessToken,
      expires_at: expiresAt.toISOString(),
    };
    const { error } = await client
      .from('kis_tokens')
      .upsert(payload as never, { onConflict: 'env' });
    if (error) {
      throw new Error(`persist kis_tokens failed: env=${env} ${error.message}`);
    }
  }

  private describeError(err: unknown): string {
    if (err instanceof AxiosError) {
      return `status=${err.response?.status ?? 'n/a'} code=${err.code ?? 'n/a'}`;
    }
    if (err instanceof Error) return err.message;
    return String(err);
  }
}

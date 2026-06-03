// KisTokenService 단위 테스트
// 모킹: axios.post (KIS API), SupabaseService.getClient() (DB).
// 의도적으로 테스트하지 않음: @Cron 데코레이터 동작 자체, 실제 KIS HTTP (E2E는 후속).

import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import axios from 'axios';
import type { KisTokenResponse } from '@tickr/shared';
import type { Env } from '../config/env.validation';
import { SupabaseService } from '../supabase/supabase.service';
import { KisTokenService } from './kis-token.service';
import { KIS_BASE_URL, TOKEN_WINDOW_MS } from './kis-token.types';

jest.mock('axios');
// jest.spyOn으로 spy 생성 — 멤버 detach 없이 axios 객체에 attached 상태 유지 (unbound-method 룰 통과).
// `as` 사용 회피로 글로벌 CLAUDE.md 룰 동시 충족.
const mockedAxiosPost = jest.spyOn(axios, 'post');

// ─── Supabase 클라이언트 mock 빌더 ─────────────────────────────────────────
interface MockSbConfig {
  selectRow?: {
    access_token: string;
    expires_at: string;
    updated_at: string;
  } | null;
  selectError?: { message: string } | null;
  upsertError?: { message: string } | null;
}

const buildSupabaseMock = (cfg: MockSbConfig = {}) => {
  const maybeSingle = jest.fn().mockResolvedValue({
    data: cfg.selectRow ?? null,
    error: cfg.selectError ?? null,
  });
  const eq = jest.fn().mockReturnValue({ maybeSingle });
  const select = jest.fn().mockReturnValue({ eq });
  const upsert = jest.fn().mockResolvedValue({
    error: cfg.upsertError ?? null,
  });
  const from = jest.fn().mockReturnValue({ select, upsert });
  return {
    client: { from },
    spies: { from, select, eq, maybeSingle, upsert },
  };
};

// ─── Helper: 유효 KIS 응답 ──────────────────────────────────────────────────
const validKisResponse = (
  overrides?: Partial<KisTokenResponse>,
): KisTokenResponse => ({
  access_token: 'eyJhbGciOiJIUzI1NiJ9.payload.signature_abcdef0123456789',
  access_token_token_expired: '2026-05-29 13:24:00',
  token_type: 'Bearer',
  expires_in: 86400,
  ...overrides,
});

// ─── Helper: env config stub ────────────────────────────────────────────────
const buildConfigStub = (
  overrides: Partial<Record<keyof Env, unknown>> = {},
) => {
  const defaults: Record<string, unknown> = {
    KIS_USE_MOCK: true,
    KIS_APP_KEY: 'test_app_key_min_20_chars_xxxx',
    KIS_APP_SECRET: 'test_app_secret_min_20_chars_yyy',
  };
  const merged: Record<string, unknown> = { ...defaults, ...overrides };
  return {
    // 반환 타입을 unknown으로 좁혀 unsafe-return 룰 통과.
    get: jest.fn((key: string): unknown => merged[key]),
  };
};

const buildService = async (
  sbMock: ReturnType<typeof buildSupabaseMock>,
  configOverrides: Partial<Record<keyof Env, unknown>> = {},
): Promise<KisTokenService> => {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      KisTokenService,
      {
        provide: ConfigService,
        useValue: buildConfigStub(configOverrides),
      },
      {
        provide: SupabaseService,
        useValue: { getClient: () => sbMock.client },
      },
    ],
  }).compile();
  return module.get(KisTokenService);
};

describe('KisTokenService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // IT-1: 콜드 스타트 — DB miss → KIS 호출 → 메모리/DB 양쪽 저장
  // ──────────────────────────────────────────────────────────────────────────
  it('cold init: DB miss → calls KIS once and persists to memory + DB', async () => {
    const sb = buildSupabaseMock({ selectRow: null });
    mockedAxiosPost.mockResolvedValueOnce({ data: validKisResponse() });

    const service = await buildService(sb);
    await service.onModuleInit();

    expect(sb.spies.from).toHaveBeenCalledWith('kis_tokens');
    expect(mockedAxiosPost).toHaveBeenCalledTimes(1);
    expect(mockedAxiosPost).toHaveBeenCalledWith(
      `${KIS_BASE_URL.mock}/oauth2/tokenP`,
      expect.objectContaining({
        grant_type: 'client_credentials',
        appkey: 'test_app_key_min_20_chars_xxxx',
        appsecret: 'test_app_secret_min_20_chars_yyy',
      }),
      expect.objectContaining({ timeout: 10_000 }),
    );
    expect(sb.spies.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        env: 'mock',
        access_token: validKisResponse().access_token,
      }),
      expect.objectContaining({ onConflict: 'env' }),
    );

    // 후속 getToken은 KIS 호출 없이 캐시 hit
    const token = await service.getToken();
    expect(token).toBe(validKisResponse().access_token);
    expect(mockedAxiosPost).toHaveBeenCalledTimes(1);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // IT-2: 콜드 스타트 — DB hit + 유효 → KIS 호출 안 함
  // ──────────────────────────────────────────────────────────────────────────
  it('cold init: DB hit with valid token → no KIS call', async () => {
    const futureIso = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
    const sb = buildSupabaseMock({
      selectRow: {
        access_token: 'cached_token_value_from_db_xxxx',
        expires_at: futureIso,
        updated_at: new Date().toISOString(),
      },
    });

    const service = await buildService(sb);
    await service.onModuleInit();

    expect(mockedAxiosPost).not.toHaveBeenCalled();
    const token = await service.getToken();
    expect(token).toBe('cached_token_value_from_db_xxxx');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // IT-3: 콜드 스타트 — DB hit + 만료 1분 미만 → refresh 트리거
  // ──────────────────────────────────────────────────────────────────────────
  it('cold init: DB token expiring soon (<1min) → triggers KIS refresh', async () => {
    const nearExpiryIso = new Date(Date.now() + 30 * 1000).toISOString();
    const sb = buildSupabaseMock({
      selectRow: {
        access_token: 'stale_token_about_to_expire',
        expires_at: nearExpiryIso,
        updated_at: new Date().toISOString(),
      },
    });
    mockedAxiosPost.mockResolvedValueOnce({ data: validKisResponse() });

    const service = await buildService(sb);
    await service.onModuleInit();

    expect(mockedAxiosPost).toHaveBeenCalledTimes(1);
    expect(sb.spies.upsert).toHaveBeenCalledTimes(1);
    const token = await service.getToken();
    expect(token).toBe(validKisResponse().access_token);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // IT-4: single-flight — 동시 10회 getToken → KIS 정확히 1회
  // ──────────────────────────────────────────────────────────────────────────
  it('single-flight: 10 concurrent getToken calls when stale → KIS called exactly once', async () => {
    const sb = buildSupabaseMock({ selectRow: null });
    // onModuleInit 시 1회 + ensureFresh가 single-flight 발화 시 1회로 합산
    let kisCalls = 0;
    mockedAxiosPost.mockImplementation(async () => {
      kisCalls += 1;
      // 비동기 지연으로 single-flight 윈도우 확보
      await new Promise((r) => setTimeout(r, 50));
      return { data: validKisResponse({ access_token: `t_${kisCalls}` }) };
    });

    const service = await buildService(sb);
    await service.onModuleInit();
    expect(kisCalls).toBe(1); // 콜드 init 1회

    // 만료 임박 상태로 강제 셋팅 — 캐시 직접 조작
    const cached = service.getCachedToken('mock');
    expect(cached).not.toBeNull();
    // expiresAt을 30초 뒤로 (windowMs=60_000보다 작아 isExpiringSoon=true)
    cached!.expiresAt = new Date(Date.now() + 30_000);

    // 10건 동시 호출
    const results = await Promise.all(
      Array.from({ length: 10 }, () => service.getToken()),
    );

    // KIS 호출은 콜드 1회 + 동시 호출 1회 = 2회. 단일 동시 그룹은 1회 보장.
    expect(kisCalls).toBe(2);
    // 모두 동일 토큰 반환
    const first = results[0];
    expect(results.every((t) => t === first)).toBe(true);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // IT-5: KIS 401 → throw, 이전 cache 보존, inflight 비워짐
  // ──────────────────────────────────────────────────────────────────────────
  it('KIS 401: throws, preserves prior cache, clears inflight', async () => {
    const futureIso = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
    const sb = buildSupabaseMock({
      selectRow: {
        access_token: 'previous_valid_token_value',
        expires_at: futureIso,
        updated_at: new Date().toISOString(),
      },
    });

    const service = await buildService(sb);
    await service.onModuleInit();
    expect(mockedAxiosPost).not.toHaveBeenCalled();

    // ensureFresh 강제 호출 시 401
    mockedAxiosPost.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 401 },
      code: 'ERR_BAD_REQUEST',
    });

    await expect(service.ensureFresh('mock')).rejects.toBeDefined();

    // 이전 캐시는 그대로 (refresh가 upsert 전에 실패해서 cache.set 안 됨)
    const cached = service.getCachedToken('mock');
    expect(cached?.accessToken).toBe('previous_valid_token_value');

    // inflight 비워졌는지 — 다음 호출이 새 promise를 시작해야 함
    mockedAxiosPost.mockResolvedValueOnce({ data: validKisResponse() });
    const tokenAfter = await service.ensureFresh('mock');
    expect(tokenAfter).toBe(validKisResponse().access_token);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // IT-6: isExpiringSoon — 윈도우 경계 검증
  // ──────────────────────────────────────────────────────────────────────────
  it('isExpiringSoon: respects window boundaries (1min / 10min)', async () => {
    const sb = buildSupabaseMock({ selectRow: null });
    mockedAxiosPost.mockResolvedValueOnce({ data: validKisResponse() });
    const service = await buildService(sb);
    await service.onModuleInit();

    const now = Date.now();
    const tokenAt = (deltaMs: number) => ({
      accessToken: 'x',
      expiresAt: new Date(now + deltaMs),
      updatedAt: new Date(),
    });

    // 1분 윈도우
    expect(
      service.isExpiringSoon(tokenAt(59 * 1000), TOKEN_WINDOW_MS.GET_TOKEN),
    ).toBe(true);
    expect(
      service.isExpiringSoon(tokenAt(61 * 1000), TOKEN_WINDOW_MS.GET_TOKEN),
    ).toBe(false);

    // 10분 윈도우
    expect(
      service.isExpiringSoon(tokenAt(9 * 60 * 1000), TOKEN_WINDOW_MS.CRON),
    ).toBe(true);
    expect(
      service.isExpiringSoon(tokenAt(11 * 60 * 1000), TOKEN_WINDOW_MS.CRON),
    ).toBe(false);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // IT-7: KIS_USE_MOCK=false → live baseURL 사용
  // ──────────────────────────────────────────────────────────────────────────
  it('KIS_USE_MOCK=false: uses live baseURL', async () => {
    const sb = buildSupabaseMock({ selectRow: null });
    mockedAxiosPost.mockResolvedValueOnce({ data: validKisResponse() });

    const service = await buildService(sb, { KIS_USE_MOCK: false });
    await service.onModuleInit();

    expect(service.getEnv()).toBe('live');
    expect(service.getBaseUrl()).toBe(KIS_BASE_URL.live);
    expect(mockedAxiosPost).toHaveBeenCalledWith(
      `${KIS_BASE_URL.live}/oauth2/tokenP`,
      expect.anything(),
      expect.anything(),
    );
  });

  // ──────────────────────────────────────────────────────────────────────────
  // IT-8: KIS expires_in 비정상(<60) → throw, persist 호출 안 함
  // ──────────────────────────────────────────────────────────────────────────
  it('invalid expires_in (<60s): throws and skips persist', async () => {
    const sb = buildSupabaseMock({ selectRow: null });
    mockedAxiosPost.mockResolvedValueOnce({
      data: validKisResponse({ expires_in: 30 }),
    });

    const service = await buildService(sb);
    await expect(service.onModuleInit()).rejects.toThrow(/expires_in invalid/);
    expect(sb.spies.upsert).not.toHaveBeenCalled();
  });
});

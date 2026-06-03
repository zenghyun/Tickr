// /symbols/* 엔드포인트 e2e — Controller + Guard + ZodValidationPipe + 응답 매핑 검증.
// SymbolsService는 mock으로 override (실 Supabase RPC 호출은 수동 curl로 별도 검증).
// JWT은 auth.e2e와 동일 패턴(jose.SignJWT + TEST_SECRET).
import { INestApplication, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SignJWT } from 'jose';
import request from 'supertest';
import { z } from 'zod';
import { AppModule } from '../src/app.module';
import { SymbolsService } from '../src/symbols/symbols.service';

const TEST_SECRET = 'test-secret-1234567890-please-change-in-prod';
const TEST_URL = 'http://localhost:54321';
const TEST_ISS = `${TEST_URL}/auth/v1`;

const searchRowSchema = z.object({
  symbol: z.string(),
  nameKo: z.string().nullable(),
  nameEn: z.string().nullable(),
  exchange: z.string(),
  market: z.string(),
  currency: z.string(),
});

const detailSchema = searchRowSchema.extend({
  isActive: z.boolean(),
  listingDate: z.string().nullable(),
});

const sign = async (
  sub = '00000000-0000-0000-0000-000000000001',
): Promise<string> => {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ email: 'test@tickr.dev', role: 'authenticated' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(sub)
    .setIssuer(TEST_ISS)
    .setAudience('authenticated')
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(new TextEncoder().encode(TEST_SECRET));
};

// Mock fixtures — search_symbols RPC가 반환할 row와 동일한 구조의 매핑된 결과.
const FIXTURES = {
  samsung: [
    {
      symbol: '005930',
      nameKo: '삼성전자',
      nameEn: 'Samsung Electronics',
      exchange: 'KOSPI',
      market: 'KR',
      currency: 'KRW',
    },
    {
      symbol: '207940',
      nameKo: '삼성바이오로직스',
      nameEn: 'Samsung Biologics',
      exchange: 'KOSPI',
      market: 'KR',
      currency: 'KRW',
    },
  ],
  apple: [
    {
      symbol: 'AAPL',
      nameKo: '애플',
      nameEn: 'Apple Inc.',
      exchange: 'NASDAQ',
      market: 'US',
      currency: 'USD',
    },
  ],
  aaplDetail: {
    symbol: 'AAPL',
    nameKo: '애플',
    nameEn: 'Apple Inc.',
    exchange: 'NASDAQ',
    market: 'US',
    currency: 'USD',
    isActive: true,
    listingDate: '1980-12-12',
  },
};

describe('Symbols (e2e)', () => {
  let app: INestApplication;
  const searchSpy = jest.fn();
  const detailSpy = jest.fn();

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(SymbolsService)
      .useValue({
        search: searchSpy,
        detail: detailSpy,
      })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    searchSpy.mockReset();
    detailSpy.mockReset();
  });

  // ─── /symbols/search ──────────────────────────────────────────────────────

  it('401: Bearer 없음 → search 차단', async () => {
    const res = await request(app.getHttpServer()).get(
      '/symbols/search?q=삼성',
    );
    expect(res.status).toBe(401);
    expect(searchSpy).not.toHaveBeenCalled();
  });

  it('400: q 빈 문자열 → VALIDATION_FAILED', async () => {
    const token = await sign();
    const res = await request(app.getHttpServer())
      .get('/symbols/search?q=')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
    // res.body 자체 검색 — errorBodySchema는 추가 필드를 strip하므로 사용 안 함
    expect(JSON.stringify(res.body)).toMatch(/VALIDATION_FAILED/);
    expect(searchSpy).not.toHaveBeenCalled();
  });

  it('400: limit 초과(>50) → 차단', async () => {
    const token = await sign();
    const res = await request(app.getHttpServer())
      .get('/symbols/search?q=A&limit=100')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
    expect(searchSpy).not.toHaveBeenCalled();
  });

  it('200: 한글 부분 매치 — q=삼성', async () => {
    searchSpy.mockResolvedValueOnce(FIXTURES.samsung);
    const token = await sign();
    const res = await request(app.getHttpServer())
      .get('/symbols/search?q=삼성')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const body = z.array(searchRowSchema).parse(res.body);
    expect(body).toHaveLength(2);
    expect(body[0].nameKo).toContain('삼성');
    expect(searchSpy).toHaveBeenCalledWith({
      q: '삼성',
      limit: 20,
    });
  });

  it('200: 한글 → US 종목 매치 — q=애플 → AAPL', async () => {
    searchSpy.mockResolvedValueOnce(FIXTURES.apple);
    const token = await sign();
    const res = await request(app.getHttpServer())
      .get('/symbols/search?q=애플')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const body = z.array(searchRowSchema).parse(res.body);
    expect(body[0].symbol).toBe('AAPL');
    expect(body[0].nameKo).toBe('애플');
    expect(body[0].market).toBe('US');
  });

  it('200: symbol prefix — q=AAPL', async () => {
    searchSpy.mockResolvedValueOnce(FIXTURES.apple);
    const token = await sign();
    const res = await request(app.getHttpServer())
      .get('/symbols/search?q=AAPL')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const body = z.array(searchRowSchema).parse(res.body);
    expect(body[0].symbol).toBe('AAPL');
  });

  it('200: market 필터 — q=삼성&market=KR', async () => {
    searchSpy.mockResolvedValueOnce(FIXTURES.samsung);
    const token = await sign();
    const res = await request(app.getHttpServer())
      .get('/symbols/search?q=삼성&market=KR')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(searchSpy).toHaveBeenCalledWith({
      q: '삼성',
      market: 'KR',
      limit: 20,
    });
  });

  it('200: market 필터 — q=삼성&market=US → 빈 배열', async () => {
    searchSpy.mockResolvedValueOnce([]);
    const token = await sign();
    const res = await request(app.getHttpServer())
      .get('/symbols/search?q=삼성&market=US')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('400: market 잘못된 값 → 차단', async () => {
    const token = await sign();
    const res = await request(app.getHttpServer())
      .get('/symbols/search?q=A&market=XX')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
    expect(searchSpy).not.toHaveBeenCalled();
  });

  // ─── /symbols/:symbol ─────────────────────────────────────────────────────

  it('401: Bearer 없음 → detail 차단', async () => {
    const res = await request(app.getHttpServer()).get('/symbols/AAPL');
    expect(res.status).toBe(401);
    expect(detailSpy).not.toHaveBeenCalled();
  });

  it('200: detail — AAPL', async () => {
    detailSpy.mockResolvedValueOnce(FIXTURES.aaplDetail);
    const token = await sign();
    const res = await request(app.getHttpServer())
      .get('/symbols/AAPL')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const body = detailSchema.parse(res.body);
    expect(body.symbol).toBe('AAPL');
    expect(body.isActive).toBe(true);
    expect(body.listingDate).toBe('1980-12-12');
    expect(detailSpy).toHaveBeenCalledWith('AAPL');
  });

  it('404: 존재하지 않는 종목 — ZZZZZ', async () => {
    detailSpy.mockRejectedValueOnce(
      new NotFoundException({
        message: 'symbol not found: ZZZZZ',
        code: 'SYMBOL_NOT_FOUND',
      }),
    );
    const token = await sign();
    const res = await request(app.getHttpServer())
      .get('/symbols/ZZZZZ')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(JSON.stringify(res.body)).toMatch(/SYMBOL_NOT_FOUND/);
  });
});

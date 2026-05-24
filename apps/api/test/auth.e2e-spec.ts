// AC-1 ~ AC-8 e2e — supertest + self-signed JWT (jose.SignJWT).
// 실제 Supabase 호출 없이 Guard 동작만 검증. Service_role client는 모듈 init만 됨 (외부 호출 X).
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SignJWT } from 'jose';
import request from 'supertest';
import { z } from 'zod';
import { AppModule } from '../src/app.module';

// env는 test/jest.setup.ts(setupFiles)에서 주입됨. 여기서는 동일 값을 참조해 sign 비교용으로만 사용.
const TEST_SECRET = 'test-secret-1234567890-please-change-in-prod';
const TEST_URL = 'http://localhost:54321';
const TEST_ISS = `${TEST_URL}/auth/v1`;

// 응답 본문 타입 좁히기 (eslint no-unsafe-* 회피, as 단언 금지 룰 준수)
const errorBodySchema = z.object({ message: z.string() });
const userBodySchema = z.object({
  id: z.string(),
  email: z.string(),
  role: z.string(),
});

const secretBytes = () => new TextEncoder().encode(TEST_SECRET);

interface SignOpts {
  sub?: string;
  email?: string;
  role?: string;
  aud?: string;
  iss?: string;
  expSecondsFromNow?: number; // 음수면 만료
  secret?: Uint8Array;
}

const signTestJwt = async (opts: SignOpts = {}): Promise<string> => {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + (opts.expSecondsFromNow ?? 3600);
  return new SignJWT({
    email: opts.email ?? 'test@tickr.dev',
    role: opts.role ?? 'authenticated',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(opts.sub ?? '00000000-0000-0000-0000-000000000001')
    .setIssuer(opts.iss ?? TEST_ISS)
    .setAudience(opts.aud ?? 'authenticated')
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .sign(opts.secret ?? secretBytes());
};

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('AC-1: returns 401 when Authorization header is missing', async () => {
    const res = await request(app.getHttpServer()).get('/auth/me');
    expect(res.status).toBe(401);
    const body = errorBodySchema.parse(res.body);
    expect(body.message).toMatch(/MISSING_TOKEN/);
  });

  it('AC-2: returns 401 when scheme is not Bearer', async () => {
    const res = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', 'Basic abc123');
    expect(res.status).toBe(401);
    const body = errorBodySchema.parse(res.body);
    expect(body.message).toMatch(/MALFORMED_TOKEN/);
  });

  it('AC-3: returns 401 for malformed JWT', async () => {
    const res = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', 'Bearer not.a.valid.jwt');
    expect(res.status).toBe(401);
    const body = errorBodySchema.parse(res.body);
    expect(body.message).toMatch(/INVALID_TOKEN/);
  });

  it('AC-4: returns 401 when token expired', async () => {
    const token = await signTestJwt({ expSecondsFromNow: -60 });
    const res = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
    const body = errorBodySchema.parse(res.body);
    expect(body.message).toMatch(/TOKEN_EXPIRED/);
  });

  it('AC-5: returns 401 when signature mismatches', async () => {
    const wrongSecret = new TextEncoder().encode(
      'wrong-secret-1234567890-different',
    );
    const token = await signTestJwt({ secret: wrongSecret });
    const res = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
    const body = errorBodySchema.parse(res.body);
    expect(body.message).toMatch(/INVALID_TOKEN/);
  });

  it('AC-6: returns 401 when issuer differs', async () => {
    const token = await signTestJwt({ iss: 'https://evil.example/auth/v1' });
    const res = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
    const body = errorBodySchema.parse(res.body);
    expect(body.message).toMatch(/INVALID_TOKEN/);
  });

  it('AC-7: returns 200 with user payload for a valid token', async () => {
    const token = await signTestJwt({
      sub: '11111111-2222-3333-4444-555555555555',
      email: 'alice@tickr.dev',
    });
    const res = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const body = userBodySchema.parse(res.body);
    expect(body).toEqual({
      id: '11111111-2222-3333-4444-555555555555',
      email: 'alice@tickr.dev',
      role: 'authenticated',
    });
  });

  it('AC-8: tolerates 5s clock skew on exp', async () => {
    const token = await signTestJwt({ expSecondsFromNow: -3 });
    const res = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});

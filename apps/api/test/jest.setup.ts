// 모든 e2e 테스트 공통 env 주입 (jest-e2e.json의 setupFiles에서 호출).
// 실제 .env 의존하지 않음 — CI 안전.
// app.module.ts의 ConfigModule은 NODE_ENV=test일 때 ignoreEnvFile=true로 .env 무시.

process.env.NODE_ENV = 'test';
process.env.API_PORT = '4001';
process.env.SUPABASE_URL = 'http://localhost:54321';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key-1234567890';
process.env.SUPABASE_JWT_SECRET =
  'test-secret-1234567890-please-change-in-prod';
process.env.SUPABASE_ANON_KEY = 'test-anon-key-1234567890';

// KIS OpenAPI — env.validation의 min(20) 통과용 더미. 실제 KIS API 호출은 단위 테스트에서 mock.
// e2e에서는 KisTokenService.onModuleInit이 hydrateFromDb 결과에 따라 KIS HTTP 시도 가능 —
// e2e 셋업에서 Supabase 클라이언트가 실제 호출되지 않도록 별도 mocking 필요(향후 quote/trade e2e 작성 시).
process.env.KIS_USE_MOCK = 'true';
process.env.KIS_APP_KEY = 'test-kis-app-key-1234567890-mock';
process.env.KIS_APP_SECRET = 'test-kis-app-secret-1234567890-mock';

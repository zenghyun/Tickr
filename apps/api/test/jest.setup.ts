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

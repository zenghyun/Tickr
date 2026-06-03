// env 검증 — ConfigModule.forRoot의 validate 콜백에서 1회 실행 (fail-fast)
// 부팅 시 비밀키/URL이 비어있으면 NestFactory.create 단계에서 throw → 잘못된 env로는 절대 기동 안 됨.
import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  API_PORT: z.coerce.number().int().positive().default(4000),

  // Supabase 서버 전용 비밀 (EXPO_PUBLIC_* 금지)
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  SUPABASE_JWT_SECRET: z.string().min(20),
  SUPABASE_ANON_KEY: z.string().min(20).optional(),

  // KIS OpenAPI — 서버 전용 비밀 (EXPO_PUBLIC_* 금지)
  // KIS_USE_MOCK=true(default) → 모의(openapivts:29443), false → 실전(openapi:9443).
  // baseURL은 KIS_USE_MOCK에서 파생 — env에 두 URL 동시 보관 X (드리프트 방지).
  KIS_USE_MOCK: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .transform((v) => (typeof v === 'boolean' ? v : v === 'true'))
    .default(true),
  KIS_APP_KEY: z.string().min(20),
  KIS_APP_SECRET: z.string().min(20),
});

export type Env = z.infer<typeof EnvSchema>;

export const validateEnv = (raw: Record<string, unknown>): Env => {
  const parsed = EnvSchema.safeParse(raw);
  if (!parsed.success) {
    // 비밀 값 자체는 출력 안 함. 어떤 키가 문제인지만 노출.
    const issues = parsed.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`[env] validation failed:\n${issues}`);
  }
  return parsed.data;
};

// 환경변수 단일 출처 — EXPO_PUBLIC_* 만 클라이언트 번들에 노출
// 비밀키(SUPABASE_SERVICE_ROLE_KEY 등)는 절대 여기에 두지 말 것
// expo-router는 process.env로 EXPO_PUBLIC_* 를 정적 inline 해줌
import { resolveDevUrl } from '@/shared/lib/dev-host';

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `필수 환경변수 누락: ${name}. apps/mobile/.env 또는 모노레포 루트 .env 확인 필요.`,
    );
  }
  return value;
}

function optional(value: string | undefined, fallback: string): string {
  return value || fallback;
}

export const env = {
  // 실기기(Expo Go)에서 localhost는 폰 자신을 가리키므로 Metro LAN IP로 자동 치환.
  // 시뮬레이터/운영 빌드에서는 no-op (resolveDevUrl 내부에서 판별).
  apiUrl: resolveDevUrl(
    required('EXPO_PUBLIC_API_URL', process.env.EXPO_PUBLIC_API_URL),
  ),
  wsUrl: resolveDevUrl(
    required('EXPO_PUBLIC_WS_URL', process.env.EXPO_PUBLIC_WS_URL),
  ),
  supabaseUrl: required('EXPO_PUBLIC_SUPABASE_URL', process.env.EXPO_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: required('EXPO_PUBLIC_SUPABASE_ANON_KEY', process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY),
  appEnv: optional(process.env.EXPO_PUBLIC_APP_ENV, 'development'),
} as const;

export const isDev = env.appEnv === 'development';

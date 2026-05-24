// Supabase 클라이언트 싱글톤 — 모바일 전용
// (.claude/rules/monorepo-boundary.md — RN-only 격리)
//
// 직접 import 금지: entity/feature/widget/page 코드는 절대 이 파일을
// 우회해서 '@supabase/supabase-js'를 import 하면 안 된다.
// 항상 '@/shared/lib' 경유로 supabase 인스턴스만 가져갈 것.
// (lefthook pre-commit이 패턴 검사로 차단함)
//
// 세션 저장소: expo-secure-store (storage.ts의 supabaseStorageAdapter)
// 이로써 토큰은 iOS Keychain / Android Keystore에 보관된다.
// AsyncStorage(평문 디스크) 사용 금지.
import { createClient } from '@supabase/supabase-js';

import { env } from '@/shared/config/env';

import { supabaseStorageAdapter } from './storage';

// 싱글톤 — 앱 전체에서 단일 인스턴스 공유.
// RN은 모듈 캐시가 프로세스 단위라 import만 일치하면 자동 싱글톤이지만,
// 의도를 명시하기 위해 named export 한 곳만 둔다.
export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    // 토큰을 SecureStore(Keychain/Keystore)에 보관
    storage: supabaseStorageAdapter,
    // 앱 재시작 시 세션 복구
    persistSession: true,
    // 만료 임박 시 자동 갱신 (백그라운드 복귀 시 동작)
    autoRefreshToken: true,
    // RN에는 URL hash 기반 세션 감지가 필요 없음 (딥링크 OAuth는 별도 처리)
    detectSessionInUrl: false,
  },
});

// 타입 추론용 재export — 다른 슬라이스가 SupabaseClient 타입을 직접 참조해야 할 때.
// 인스턴스가 아니라 "타입"만 노출하므로 격리 원칙에 위배되지 않음.
export type { Session, User, AuthError } from '@supabase/supabase-js';

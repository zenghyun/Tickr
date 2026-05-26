// shared/lib public API
// 도메인 무지 유틸. RN-only 의존이 있는 모듈은 여기서만 사용 (entity/feature 직접 import 금지)
export * from './format';
export * from './platform';
export * from './cn';
export { storage, supabaseStorageAdapter } from './storage';
export { supabase } from './supabase';
export type { Session, User, AuthError, AuthChangeEvent } from './supabase';
export { router, Redirect, Link } from './navigation';
export type { Href } from './navigation';
export {
  mapAuthError,
  mapSupabaseAuthError,
  AUTH_ERROR_FALLBACK,
  AUTH_ERROR_INVALID_CREDENTIALS,
} from './auth-error';

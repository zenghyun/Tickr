// Supabase 인증 에러 → 사용자 친화 KR 메시지 매핑
// (.claude/rules/monorepo-boundary.md) — features/login·signup 양쪽이 동일 매핑을 쓰므로
// features 간 cross-import 금지 규칙(.claude/rules/fsd-structure.md)을 회피하기 위해 shared/lib에 격상.
//
// 보안 메모 (PM/Architect 합의):
//   - 로그인 실패는 "이메일 또는 비밀번호가 일치하지 않습니다"로 통일 — 이메일 존재 여부 노출 금지.
//   - 원본 에러 메시지는 console.log로만(W8에 logger로 교체).
//   - 사용자에게 기술적 메시지("JWT", "RLS" 등) 노출 금지.
//
// 매핑 우선순위:
//   1) Supabase AuthApiError.code (안정적, 신규)
//   2) AuthError.message 패턴 매칭 (구버전 호환)
//   3) 네트워크/TypeError 감지
//   4) fallback
import type { AuthError } from './supabase';

export const AUTH_ERROR_FALLBACK = '일시적인 문제가 발생했습니다. 다시 시도해주세요.';
export const AUTH_ERROR_INVALID_CREDENTIALS =
  '이메일 또는 비밀번호가 일치하지 않습니다.';

interface SupabaseAuthErrorLike {
  code?: string;
  message?: string;
  status?: number;
  name?: string;
}

const isAuthErrorLike = (e: unknown): e is SupabaseAuthErrorLike =>
  typeof e === 'object' && e !== null && ('code' in e || 'message' in e);

export const mapAuthError = (error: unknown): string => {
  if (!error) return AUTH_ERROR_FALLBACK;

  // 네트워크 실패 (TypeError: Network request failed / fetch fail)
  if (error instanceof TypeError) {
    return '네트워크 연결을 확인해주세요.';
  }

  if (!isAuthErrorLike(error)) return AUTH_ERROR_FALLBACK;

  const code = error.code;
  const message = (error.message ?? '').toLowerCase();

  // 1) code 우선 매핑 (Supabase v2 신규 에러 코드)
  switch (code) {
    case 'invalid_credentials':
      return AUTH_ERROR_INVALID_CREDENTIALS;
    case 'email_not_confirmed':
      return '이메일 인증이 완료되지 않았습니다. 메일함을 확인해주세요.';
    case 'user_already_exists':
    case 'email_exists':
      return '이미 가입된 이메일입니다. 로그인을 시도해주세요.';
    case 'weak_password':
      return '비밀번호가 너무 단순합니다. 8자 이상 + 영문·숫자·특수문자(!@#$ 등) 각 1개 이상을 사용해주세요.';
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.';
    case 'signup_disabled':
      return '현재 회원가입이 비활성화되어 있습니다.';
    case 'email_address_not_authorized':
      return '베타 참여 대상이 아닌 이메일입니다.';
  }

  // 2) message 패턴 매칭 (code 미제공 구버전)
  if (message.includes('invalid login credentials')) {
    return AUTH_ERROR_INVALID_CREDENTIALS;
  }
  if (message.includes('user already registered')) {
    return '이미 가입된 이메일입니다. 로그인을 시도해주세요.';
  }
  if (message.includes('email not confirmed')) {
    return '이메일 인증이 완료되지 않았습니다. 메일함을 확인해주세요.';
  }
  if (message.includes('password should be')) {
    return '비밀번호가 너무 단순합니다. 8자 이상 + 영문·숫자·특수문자(!@#$ 등) 각 1개 이상을 사용해주세요.';
  }
  if (message.includes('rate limit')) {
    return '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.';
  }

  // 3) HTTP status 보조 분기
  if (error.status === 429) {
    return '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.';
  }
  if (error.status && error.status >= 500) {
    return '서버에 일시적인 문제가 있습니다. 잠시 후 다시 시도해주세요.';
  }

  return AUTH_ERROR_FALLBACK;
};

// AuthError 타입을 알 수 있는 컨텍스트에서 명시적으로 사용할 수 있도록 named alias.
export const mapSupabaseAuthError = (error: AuthError): string =>
  mapAuthError(error);

// AuthProvider — 앱 boot 시 1회 세션 복원 + auth state listener 마운트
// .claude/rules/fsd-structure.md (app 레이어 전역 provider)
//
// 흐름:
//   1) useAuthListener()로 onAuthStateChange 구독 (cleanup 포함)
//   2) supabase.auth.getSession()으로 초기 세션 확정 → isReady=true
//   3) isReady 전에는 children 렌더 안 함 (PM D-4) — 인증 의존 화면 미정합 차단
//   4) isReady=true 전환 직후 hideSplash() 호출 → 네이티브 splash 해제 (Issue #9 / Architect ADR-2)
//   5) 3초 timeout 가드 — SecureStore/네트워크 hang 시 강제 ready (Architect ADR-3)
//
// INITIAL_SESSION 이벤트를 기다리지 않고 getSession() 1회 await로 ready 토글 (ADR-2):
//   - getSession은 SecureStore에서 동기 복원 → 네트워크 없음
//   - listener가 INITIAL_SESSION을 별도로 받아 invalidate
import { useEffect, useState, type ReactNode } from 'react';

import { useAuthListener } from '@/entities/auth';
import { hideSplash, supabase } from '@/shared/lib';

interface Props {
  children: ReactNode;
}

// Architect ADR-3 — getSession은 cancel 불가. timeout 후 백그라운드 응답은
// onAuthStateChange 리스너(useAuthListener)가 후속 처리한다.
const BOOTSTRAP_TIMEOUT_MS = 3000;
const TIMEOUT_SENTINEL = Symbol('auth-bootstrap-timeout');

const bootstrapTimeout = (): Promise<typeof TIMEOUT_SENTINEL> =>
  new Promise((resolve) => {
    setTimeout(() => resolve(TIMEOUT_SENTINEL), BOOTSTRAP_TIMEOUT_MS);
  });

const AuthProvider = ({ children }: Props) => {
  const [isReady, setIsReady] = useState(false);

  useAuthListener();

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
        // SecureStore에서 토큰 복원 (네트워크 호출 없음)
        // race로 timeout 가드 — hang 시에도 사용자가 빈 splash에 갇히지 않음
        const result = await Promise.race([
          supabase.auth.getSession(),
          bootstrapTimeout(),
        ]);

        if (result === TIMEOUT_SENTINEL) {
          // TODO(W8): Sentry breadcrumb로 교체
          console.warn(
            `[auth] bootstrap timeout exceeded ${BOOTSTRAP_TIMEOUT_MS}ms, forcing ready`,
          );
        }
      } catch (error) {
        // SecureStore 손상 등 비상시: ready로 진입시켜 로그인 화면으로 흐름 위임
        console.log('[auth] bootstrap error', error);
      }
      if (!cancelled) {
        setIsReady(true);
        // hideSplash는 idempotent (shared/lib/splash.ts) — race/재마운트 안전
        void hideSplash();
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  // isReady 전에는 네이티브 splash가 그대로 보이므로 null 반환으로 충분
  if (!isReady) {
    return null;
  }

  return <>{children}</>;
};

export default AuthProvider;

// AuthProvider — 앱 boot 시 1회 세션 복원 + auth state listener 마운트
// .claude/rules/fsd-structure.md (app 레이어 전역 provider)
//
// 흐름:
//   1) useAuthListener()로 onAuthStateChange 구독 (cleanup 포함)
//   2) supabase.auth.getSession()으로 초기 세션 확정 → isReady=true
//   3) isReady 전에는 children 렌더 안 함 (PM D-4) — 인증 의존 화면 미정합 차단
//
// INITIAL_SESSION 이벤트를 기다리지 않고 getSession() 1회 await로 ready 토글 (ADR-2):
//   - getSession은 SecureStore에서 동기 복원 → 네트워크 없음
//   - listener가 INITIAL_SESSION을 별도로 받아 invalidate
import { useEffect, useState, type ReactNode } from 'react';

import { useAuthListener } from '@/entities/auth';
import { supabase } from '@/shared/lib';

interface Props {
  children: ReactNode;
}

const AuthProvider = ({ children }: Props) => {
  const [isReady, setIsReady] = useState(false);

  useAuthListener();

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
        // SecureStore에서 토큰 복원 (네트워크 호출 없음)
        await supabase.auth.getSession();
      } catch (error) {
        // SecureStore 손상 등 비상시: ready로 진입시켜 로그인 화면으로 흐름 위임
        console.log('[auth] bootstrap error', error);
      }
      if (!cancelled) {
        setIsReady(true);
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  // PM Q1 — fallback은 null (expo-router splash로 충분)
  if (!isReady) {
    return null;
  }

  return <>{children}</>;
};

export default AuthProvider;

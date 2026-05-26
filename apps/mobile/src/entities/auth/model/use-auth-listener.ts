// Supabase auth state listener hook (.claude/rules/fsd-structure.md)
//
// onAuthStateChange는 SIGNED_IN/OUT/TOKEN_REFRESHED 등을 push로 알린다.
// 본 hook은:
//   1) tokenStorage를 access_token과 동기화 (apiClient interceptor가 매 요청 시 읽음)
//   2) react-query 캐시 invalidate (SIGNED_OUT은 전체 clear)
//
// 마운트는 AuthProvider 단일 지점에서만 — 이중 구독 방지.
import { useEffect } from 'react';

import { queryClient, tokenStorage } from '@/shared/api';
import { router, supabase, type AuthChangeEvent, type Session } from '@/shared/lib';

import { authQueries } from '../api/auth.queries';

export const useAuthListener = (): void => {
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        // W8에 logger로 교체 예정
        console.log('[auth]', event);

        if (event === 'SIGNED_OUT') {
          void tokenStorage.clear();
          // 1) 이전 사용자 데이터 wipe — holdings/trades 등이 다음 로그인까지 남으면 안 됨
          queryClient.clear();
          // 2) auth.session 캐시를 명시적으로 null로 set — (tabs)/_layout 가드의
          //    useQuery observer가 즉시 null을 받도록.
          queryClient.setQueryData(authQueries.session().queryKey, null);
          // 3) 명시적 navigation — settings/search 등 (tabs) underneath 외부에
          //    push된 화면에서는 (tabs)/_layout 가드의 Redirect가 active stack을
          //    교체하지 못함(underneath 상태). 모든 active 화면을 (auth)/login으로 강제.
          //    cold-start 가드 + 본 명시 navigation이 함께 책임.
          router.replace('/(auth)/login');
          return;
        }

        if (session) {
          void tokenStorage.set(session.access_token);
        } else if (event === 'INITIAL_SESSION') {
          // 익명 boot — 토큰 부재 확정
          void tokenStorage.clear();
        }
        // USER_UPDATED/PASSWORD_RECOVERY는 토큰 자체는 동일.
        // session 있으면 위 set으로 멱등 갱신, 없으면 skip.

        void queryClient.invalidateQueries({ queryKey: authQueries.all() });
      },
    );

    return () => {
      data.subscription.unsubscribe();
    };
    // queryClient/tokenStorage/supabase 모두 모듈 싱글톤 — exhaustive-deps 대상 아님.
    // listener는 앱 lifetime 1회만 등록되어야 하므로 빈 deps 유지 (ADR-4).
  }, []);
};

// 로그아웃 mutation (.claude/rules/react-query.md)
//
// 흐름:
//   1) supabase.auth.signOut → 서버 세션 무효화 + SecureStore 토큰 삭제
//   2) onAuthStateChange('SIGNED_OUT') push
//   3) useAuthListener가 tokenStorage.clear() + queryClient.clear()
//      (이전 사용자 데이터 wipe — holdings/trades 등)
//   4) (tabs)/_layout 가드가 (auth)/login으로 cascade redirect
//
// 본 hook은 router 호출하지 않음 — 가드가 처리. 명시 invalidate도 listener가 clear하므로 불필요.
import { useMutation } from '@tanstack/react-query';

import { supabase } from '@/shared/lib';

export const useLogoutMutation = () =>
  useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
  });

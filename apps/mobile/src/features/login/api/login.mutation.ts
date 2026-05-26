// 이메일/비밀번호 로그인 mutation (.claude/rules/react-query.md)
//
// 흐름:
//   1) supabase.auth.signInWithPassword
//   2) 성공 시 supabase가 onAuthStateChange('SIGNED_IN') push
//   3) useAuthListener가 tokenStorage.set + queryClient.invalidate
//   4) (auth)/_layout 가드가 (tabs)로 자동 redirect
//
// 본 hook은 router 호출하지 않음 — 라우팅은 listener+가드가 단일 진입으로 처리.
// onSuccess의 invalidate는 안전망(listener 이벤트와 멱등). 네트워크 지연으로
// mutation onSuccess가 listener 이벤트보다 먼저 도달하는 경우를 대비.
//
// 에러는 throw — 호출부에서 mapAuthError로 사용자 메시지 변환.
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { LoginBody } from '@tickr/shared';

import { authQueries } from '@/entities/auth';
import { supabase } from '@/shared/lib';

export const useLoginMutation = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (body: LoginBody) => {
      const { data, error } = await supabase.auth.signInWithPassword(body);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: authQueries.all() });
    },
  });
};

// 이메일/비밀번호 회원가입 mutation (.claude/rules/react-query.md)
//
// 흐름 (Supabase Dashboard "Confirm email" OFF 전제 — ADR-2):
//   1) supabase.auth.signUp → auth.users INSERT + JWT 즉시 발급
//   2) handle_new_user 트리거(#4)가 profiles/accounts seed 자동 생성
//   3) onAuthStateChange('SIGNED_IN') push → listener cascade → (tabs) 진입
//
// "Confirm email" ON 정책이면 data.session === null 반환됨 — 호출부에서
// 분기해 "확인 메일을 발송했습니다" 안내 + 로그인 화면으로 명시 redirect 필요.
// 현재는 OFF 전제로 진행, ON 활성화 시 별도 분기 추가.
//
// passwordConfirm은 zod refine에서만 검증 — Supabase API에는 password만 전송.
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { SignupBody } from '@tickr/shared';

import { authQueries } from '@/entities/auth';
import { supabase } from '@/shared/lib';

export const useSignupMutation = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ email, password }: SignupBody) => {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: authQueries.all() });
    },
  });
};

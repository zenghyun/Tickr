// auth 도메인 query 팩토리 (.claude/rules/react-query.md)
//
// session(): Supabase 세션을 SecureStore persistSession에서 복원.
//   네트워크 호출 없음 (Supabase 내부 storage 동기 조회).
//   에러 시 throw 금지 — null 반환으로 익명 사용자 흐름 진입 (PM D-5).
// user(): session의 select 파생 — fetch 별도 발생 없음.
import { queryOptions } from '@tanstack/react-query';
import { supabase, type Session, type User } from '@/shared/lib';

const root = ['auth'] as const;

const fetchSession = async (): Promise<Session | null> => {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    // W8에 logger로 교체 예정
    console.log('[auth] getSession error', error.message);
    return null;
  }
  return data.session ?? null;
};

export const authQueries = {
  all: () => [...root] as const,

  session: () =>
    queryOptions({
      queryKey: [...root, 'session'] as const,
      queryFn: fetchSession,
      staleTime: Infinity,
      gcTime: Infinity,
    }),

  user: () =>
    queryOptions({
      queryKey: [...root, 'session', 'user'] as const,
      queryFn: fetchSession,
      select: (session: Session | null): User | null => session?.user ?? null,
      staleTime: Infinity,
      gcTime: Infinity,
    }),
};

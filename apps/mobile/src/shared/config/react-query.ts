// react-query 기본 옵션 단일 출처 (.claude/rules/react-query.md)
import type { DefaultOptions } from '@tanstack/react-query';

export const queryDefaults: DefaultOptions = {
  queries: {
    // 시세는 WS로 push되므로 폴링 불필요. 일반 정적 데이터는 1분.
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: (failureCount, error) => {
      // 4xx는 재시도 무의미
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status && status >= 400 && status < 500) return false;
      return failureCount < 2;
    },
    refetchOnWindowFocus: false,
    refetchOnReconnect: 'always',
  },
  mutations: {
    retry: false,
  },
};

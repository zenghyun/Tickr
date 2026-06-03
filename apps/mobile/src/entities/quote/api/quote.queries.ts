// quote 엔티티 query 팩토리 (.claude/rules/react-query.md — queryOptions 패턴).
// 백엔드: #14 GET /quote/:symbol, GET /quote/:symbol/candles?interval=&limit=
import { queryOptions } from '@tanstack/react-query';
import type { Quote, Candle, CandleInterval } from '@tickr/shared';
import { apiClient } from '@/shared/api/client';

const root = ['quote'] as const;

export const quoteQueries = {
  all: () => [...root] as const,

  // 현재가 단건. WS 미연동(W6) 동안 staleTime 짧게 — 진입 시 신선하게.
  detail: (symbol: string) =>
    queryOptions({
      queryKey: [...root, 'detail', symbol] as const,
      queryFn: ({ signal }) =>
        apiClient.get<Quote>(`/quote/${symbol}`, { signal }).then((r) => r.data),
      staleTime: 10_000,
    }),

  // 캔들 배열. interval/limit을 키에 포함 → 토글 시 별도 캐시 + 자동 refetch.
  candles: (symbol: string, interval: CandleInterval, limit = 120) =>
    queryOptions({
      queryKey: [...root, 'candles', symbol, interval, limit] as const,
      queryFn: ({ signal }) =>
        apiClient
          .get<Candle[]>(`/quote/${symbol}/candles`, {
            params: { interval, limit },
            signal,
          })
          .then((r) => r.data),
      staleTime: interval === '1d' ? 5 * 60_000 : 30_000,
    }),
};

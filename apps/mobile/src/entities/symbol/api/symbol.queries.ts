import { queryOptions } from '@tanstack/react-query';
import type { SymbolSearchResult, SymbolDetail } from '@tickr/shared';
import { apiClient } from '@/shared/api/client';

const root = ['symbols'] as const;

export const symbolQueries = {
  all: () => [...root] as const,

  search: (q: string) =>
    queryOptions({
      queryKey: [...root, 'search', q] as const,
      queryFn: ({ signal }) =>
        apiClient
          .get<SymbolSearchResult[]>('/symbols/search', { params: { q }, signal })
          .then((r) => r.data),
      enabled: q.length > 0,
      staleTime: 30_000,
    }),

  detail: (symbol: string) =>
    queryOptions({
      queryKey: [...root, 'detail', symbol] as const,
      queryFn: ({ signal }) =>
        apiClient.get<SymbolDetail>(`/symbols/${symbol}`, { signal }).then((r) => r.data),
    }),
};

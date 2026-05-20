# Rule: TanStack Query — queryOptions 팩토리 패턴 필수

`@tanstack/react-query` v5의 **`queryOptions` API**로 모든 query를 정의한다. `useQuery` 호출부에 `queryKey`/`queryFn`을 직접 박지 않는다.

## 위치 (FSD)

| 종류 | 위치 |
|---|---|
| Query 팩토리 | `entities/{entity}/api/{entity}.queries.ts` |
| Mutation hook | `features/{feature}/api/{feature}.mutation.ts` |
| QueryClient 인스턴스 | `shared/api/query-client.ts` |
| 기본 옵션(staleTime 등) | `shared/config/react-query.ts` |

## Query 팩토리 패턴

```ts
// entities/symbol/api/symbol.queries.ts
import { queryOptions } from '@tanstack/react-query';
import type { SymbolSearchResult, SymbolDetail } from '@tickr/shared';
import { apiClient } from '@/shared/api/client';

const root = ['symbols'] as const;

export const symbolQueries = {
  all: () => [...root] as const,

  search: (query: string) =>
    queryOptions({
      queryKey: [...root, 'search', query] as const,
      queryFn: ({ signal }) =>
        apiClient
          .get<SymbolSearchResult[]>('/symbols/search', { params: { q: query }, signal })
          .then((r) => r.data),
      enabled: query.length > 0,
      staleTime: 30_000,
    }),

  detail: (symbol: string) =>
    queryOptions({
      queryKey: [...root, 'detail', symbol] as const,
      queryFn: ({ signal }) =>
        apiClient.get<SymbolDetail>(`/symbols/${symbol}`, { signal }).then((r) => r.data),
      staleTime: 60_000,
    }),
};
```

## 소비측

```tsx
import { useQuery } from '@tanstack/react-query';
import { symbolQueries } from '@/entities/symbol';

const { data, isLoading } = useQuery(symbolQueries.search(debouncedQuery));
```

```ts
// prefetch
await queryClient.prefetchQuery(symbolQueries.detail(symbol));

// invalidate
queryClient.invalidateQueries({ queryKey: symbolQueries.all() });
```

## Mutation

mutation은 hook으로 감싸 `features/`에 둔다. 같은 entity의 query를 `invalidate`/`setQueryData`로 갱신.

```ts
// features/execute-trade/api/execute-trade.mutation.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { holdingQueries } from '@/entities/holding';
import { accountQueries } from '@/entities/account';

export const useExecuteTrade = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ExecuteTradeBody) =>
      apiClient.post('/trades', body).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: holdingQueries.all() });
      qc.invalidateQueries({ queryKey: accountQueries.all() });
    },
  });
};
```

## 컨벤션

- 팩토리 이름: `{entity}Queries` (camelCase + Queries 접미).
- 키 첫 segment = entity 이름. `as const` 필수.
- `signal` 받아서 `axios`/`fetch`에 전달 — 컴포넌트 unmount 시 취소.
- 컴포넌트/훅에서 인라인 `queryKey`/`queryFn` **금지**.
- staleTime 기본값은 `shared/config/react-query.ts`에 정의, query별로 필요 시 override.

## 금지

```ts
// ❌ 인라인 queryKey + queryFn
useQuery({
  queryKey: ['symbols', 'search', query],
  queryFn: () => fetch(`/symbols/search?q=${query}`),
});

// ❌ entity 외부에서 query 정의
// pages/search/ui/SearchPage.tsx 안에 queryOptions 박기
```

## 이유

- 키와 fetcher가 한 곳에 모여 invalidate/prefetch 누락 방지.
- 타입 추론이 강력해진다 (`select` 결과까지 자동 추론).
- entity 단위 이동·삭제 시 query 정의가 함께 움직임.

## 참고
- TanStack Query v5: [`queryOptions` API](https://tanstack.com/query/latest/docs/framework/react/reference/queryOptions)

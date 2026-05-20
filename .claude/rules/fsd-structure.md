# Rule: FSD 구조 (apps/mobile)

`apps/mobile/src/`는 **Feature-Sliced Design v2**를 따른다.

## 레이어 (상위 → 하위)

```
app → pages → widgets → features → entities → shared
```

각 레이어는 **하위 레이어만** import 한다. 같은/상위 레이어 import 금지.

## 슬라이스 격리

같은 레이어 안의 서로 다른 슬라이스끼리 **직접 import 금지** (cross-import 금지).

```ts
// ❌ 같은 entity 레이어의 다른 슬라이스를 직접 import
import { Holding } from '../holding';  // entities/symbol 내부에서
```

공유가 필요하면 한 레이어 아래(예: `shared`)로 내려서 공통화한다.

## Public API (배럴)

각 슬라이스는 `index.ts`로 외부에 노출할 것만 export.

```
src/entities/symbol/
├── api/symbol.queries.ts      # internal
├── model/symbol.types.ts      # internal
├── ui/SymbolRow.tsx           # internal
└── index.ts                   # ← public API
```

외부에서는 항상 슬라이스 루트로 import:
```ts
// ✅
import { symbolQueries, SymbolRow } from '@/entities/symbol';

// ❌ 내부 경로 직접 import
import { symbolQueries } from '@/entities/symbol/api/symbol.queries';
```

## 레이어별 역할

| 레이어 | 무엇을 둘 것 | 예 |
|---|---|---|
| `app` | 앱 초기화, 전역 providers | `QueryProvider`, `SupabaseProvider`, `ThemeProvider` |
| `pages` | 라우트 단위 컴포넌트(`{X}Page.tsx`) | `PortfolioPage`, `SearchPage` |
| `widgets` | 페이지에 박히는 복합 블록(여러 entity/feature 조합) | `OrderSheet`, `PriceChart`, `HoldingsList` |
| `features` | 사용자 액션 단위(동사) — mutation, form, 토글 | `execute-trade`, `search-symbols`, `toggle-watchlist` |
| `entities` | 도메인 객체(명사) — query, 타입, 표시 컴포넌트 | `symbol`, `quote`, `holding`, `trade`, `account` |
| `shared` | 도메인 무지 공용 — ui kit, lib, api client, config | `Button`, `apiClient`, `format`, `supabase` |

## 슬라이스 내부 폴더 (segments)

```
src/{layer}/{slice}/
├── api/        # 서버 통신 (queryOptions, mutation hooks)
├── model/      # 타입, store(zustand), pure 로직
├── ui/         # 컴포넌트
├── lib/        # 슬라이스 전용 유틸
├── config/     # 슬라이스 상수
└── index.ts    # public API
```

모든 segment를 만들 필요 없음. 필요할 때만.

## 라우트는 얇게

`apps/mobile/app/`의 라우트 파일은 **`<XxxPage />` import + render만**. 로직 금지.

```tsx
// app/(tabs)/index.tsx
import { PortfolioPage } from '@/pages/portfolio';
export default PortfolioPage;
```

## 이유

- entity/feature 단위로 이동·삭제·재사용이 단순해진다.
- cross-import 금지가 순환 의존을 원천 차단.
- 추후 `apps/web` 추가 시 entity의 model/api는 공유 후보, ui만 platform별 분기 가능.

## 참고
- [Feature-Sliced Design 공식 v2](https://feature-sliced.design/)

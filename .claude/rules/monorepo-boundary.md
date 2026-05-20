# Rule: 모노레포 경계와 RN-only 격리

## `@tickr/shared` vs FSD `shared` — **다른 개념**

| 이름 | 위치 | 의미 |
|---|---|---|
| `@tickr/shared` | `packages/shared/` | **모노레포 cross-app 공유** — `apps/mobile`, `apps/api`, 향후 `apps/web` 모두 import |
| FSD `shared` | `apps/mobile/src/shared/` | **모바일 내부 최하위 레이어** — 모바일 안에서만 사용 |

이름이 같다고 같은 게 아니다. 혼동 금지.

## `@tickr/shared`에 둘 것

- zod 스키마(`schemas/{entity}.ts`)
- API 응답/요청 타입
- WS 프로토콜 (`ws-protocol.ts`)
- KIS 응답 타입 (`kis-types.ts`)
- 도메인 enum, 상수 (`OrderType`, `OrderSide` 등)

## `@tickr/shared`에 두지 말 것

- `react`, `react-native`, `@nestjs/*` 등 런타임 의존
- axios/fetch 등 HTTP 클라이언트 인스턴스 (각 app이 자기 클라이언트 소유)
- 컴포넌트 (UI는 app별로)
- Node.js 전용 모듈(`fs`, `path`)

`@tickr/shared`는 **순수 TypeScript + zod**만. 양쪽 어디서든 import 해도 안전해야 한다.

## RN-only 모듈 격리 (web 확장 대비)

추후 `apps/web` 추가 가능성이 있으므로, **RN/Expo 전용 API**는 `apps/mobile/src/shared/lib/` 깊은 곳에만 둔다. entity/feature/widget/page 비즈니스 코드에서 직접 import 금지.

### RN-only 목록 (격리 대상)
- `react-native` 코어 (`View`, `Text`, `Pressable`, `AppState`, `Platform`, …)
- `expo-*` (`expo-secure-store`, `expo-router`, `expo-haptics`, …)
- `react-native-webview`
- `react-native-reanimated`, `react-native-gesture-handler`
- `@react-native-async-storage/async-storage`

### 격리 방법

```
shared/lib/
├── storage.ts        # SecureStore 래핑 → getItem/setItem 일반 인터페이스
├── supabase.ts       # SecureStore 어댑터 + supabase client
├── ws/
│   ├── tick-stream.ts
│   └── useTickStream.ts
└── platform.ts       # Platform.OS 분기 헬퍼
```

entity/feature는 이 래퍼만 import. 추후 web 추가 시 `shared/lib/*.web.ts` 또는 `Platform.select`로 분기.

### 예시

```ts
// ✅ 좋음
// shared/lib/storage.ts
import * as SecureStore from 'expo-secure-store';
export const storage = {
  get: (k: string) => SecureStore.getItemAsync(k),
  set: (k: string, v: string) => SecureStore.setItemAsync(k, v),
};

// entities/auth/model/session.ts
import { storage } from '@/shared/lib/storage';
```

```ts
// ❌ 나쁨 — entity가 RN-only 직접 import
// entities/auth/model/session.ts
import * as SecureStore from 'expo-secure-store';
```

## NestJS (apps/api) 경계

- `apps/api`는 `@tickr/shared`만 import. `apps/mobile/*`로부터의 import는 절대 없음(역방향).
- `service_role` 키는 `apps/api` 전용. `@tickr/shared`에 두지 말 것(번들에 노출 위험).

## 이유

- 모노레포 의존 그래프가 단방향 트리(`shared` ← `apps/*`)일 때 의존성 추적과 빌드 캐시(turbo)가 가장 효율적.
- web 확장 시 격리된 shared/lib만 platform별 분기하면 entity/feature/widget의 재사용성 극대화.
- 비밀키와 RN-only 코드가 잘못된 곳에 새는 것을 구조적으로 막는다.

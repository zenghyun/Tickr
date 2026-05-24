---
name: explain-diff
description: "변경된 코드(diff)를 프론트엔드 개발자 관점에서 쉽게 풀어 설명. \"이 diff 설명해줘\", \"이거 무슨 기능 하는거야\", \"방금 작업한 거 분석해줘\", \"이 PR 이해하게 도와줘\" 등의 자연어 트리거에 반응. 백엔드(NestJS/Supabase)·RN 코드를 FE 친숙 개념(React/FSD/axios)에 빗대어 실행 순서대로 풀어준다. 학습 보조용 — 코드 수정 안 함."
---

# Tickr Explain-Diff (FE 관점 코드 해설)

변경된 코드를 **프론트엔드 개발자가 이해할 수 있게** 풀어 설명한다. 사용자는 FE 경험은 풍부하지만 **백엔드(NestJS/Supabase)와 RN은 학습 중**이다. 낯선 개념을 항상 **이미 아는 FE 개념에 빗대어** 설명하는 것이 이 스킬의 핵심이다.

> **읽기 전용 스킬.** 코드를 수정하지 않는다. 오직 설명·해설만 한다. (수정이 필요하면 사용자가 별도로 요청)

## 트리거 예시

- "이 diff 설명해줘" / "이거 무슨 기능 하는거야"
- "방금 작업한 거 FE 입장에서 이해하게 설명해줘"
- "이 PR / 이 커밋 분석해줘"
- "백엔드 코드 처음이라 뭔지 모르겠어 풀어줘"
- `/explain-diff [범위]` (예: `/explain-diff staged`, `/explain-diff HEAD~1`, `/explain-diff apps/api/src/auth`)

## 대상 독자 (항상 가정)

- **FE 전문가, BE/RN 학습자.** React, hooks, props, Context, FSD, axios, zod, react-query는 이미 안다고 가정.
- 백엔드 전문 용어(DI, Guard, Provider, RPC, RLS 등)는 **반드시 FE 비유와 함께** 설명. 비유 없이 용어만 던지지 말 것.
- 한국어로 설명. 코드 식별자는 영어 그대로.

## 워크플로우

### Step 1: diff 범위 확정

사용자가 범위를 안 줬으면 아래 우선순위로 추론하고, 애매하면 한 번 확인한다.

```bash
git status --short              # 작업 중인 변경
git diff --stat                 # unstaged 요약
git diff --cached --stat        # staged 요약
git log --oneline -10           # 최근 커밋
git branch --show-current       # 현재 브랜치
```

| 사용자 표현 | 범위 |
|---|---|
| "방금 작업한 거", "지금 변경사항" | `git diff` + `git diff --cached` (working tree 전체) |
| "이 브랜치 작업", "W3 작업" | `git diff master...HEAD` (브랜치 분기점부터) |
| "이 커밋", "마지막 커밋" | `git show HEAD` 또는 `git diff HEAD~1` |
| "이 PR" + 번호 | `gh pr diff <번호>` |
| 특정 경로 지정 | `git diff -- <경로>` |

### Step 2: 실제 파일 읽기 (diff hunk만 보지 말 것)

diff의 `+`/`-` 라인만 보면 맥락을 놓친다. **변경된 파일 전체를 Read로 읽고**, 다음 맥락도 함께 확보한다:

- 관련 `.claude/rules/*.md` (예: auth → 없지만, trade → `trade-rpc.md`, UI → `nativewind-tokens.md`/`kr-finance.md`)
- import하는 `@tickr/shared` 스키마/타입
- 테스트 파일이 있으면 함께 (AC 번호 = 인수 조건)
- 새 의존성이 추가됐으면 `package.json` diff도 확인

여러 파일은 **병렬 Read**로 한 번에.

### Step 3: 설명 생성 — 아래 "출력 구조"를 따른다

---

## 출력 구조 (이 순서를 지킬 것)

### 0. 한 줄 요약
> "이 작업은 한 문장으로 요약하면 **____** 입니다."
맨 위에 굵게. 사용자가 제목만 봐도 큰 그림을 잡게.

### 1. 큰 그림 — 왜 필요한가
이 코드가 **어떤 문제를 푸는지**를 FE 흐름과 연결해 설명. 가능하면 ASCII 플로우 한 개.
- 예: "FE에서 로그인하면 토큰을 받아 axios가 헤더에 붙여 보내죠 → 서버는 이게 진짜인지 검증해야 합니다."

### 2. 핵심 개념 매핑 표
이 diff에 등장하는 백엔드/RN 개념을 **FE 개념에 매핑하는 표**. (아래 "개념 매핑 사전" 참조해서 등장한 것만 추림)

### 3. 파일별 설명 — 실행 순서대로 (알파벳/파일트리 순 금지)
**요청이 흘러가는 순서**로 번호를 매겨 설명. 먼저 전체 흐름 ASCII를 그리고, 각 파일을:
- 짧은 코드 스니펫 인용 (핵심 라인만)
- "하는 일" / "왜 이렇게?" / FE 비유
- 중요한 보안·설계 포인트는 `> 💡` 콜아웃으로

### 4. 보안/주의 콜아웃
비밀키, RLS, service_role, 로그 누설 방지 등 **사고로 이어질 수 있는 지점**을 별도로 짚는다. Tickr는 금융 앱이라 특히 중요.

### 5. 테스트 설명 (테스트 파일이 있으면)
각 테스트가 **어떤 시나리오를 검증하는지** 표로. "진짜 외부 서비스를 부르는지 / 가짜로 때우는지"도 명시 (mock 여부).

### 6. 한 장 요약
전체를 ASCII 다이어그램 1개 + 핵심 비유 3~5줄로 압축.

### 7. 후속 제안
더 깊이 팔 수 있는 주제 2~4개를 제시하고 무엇을 원하는지 물어본다. (원리, 트레이드오프, 다음 단계 흐름, 문법 등) — 직접 서버 띄워 `curl`로 눈으로 확인하는 옵션도 좋다.

---

## 개념 매핑 사전 (재사용 자산)

등장한 것만 골라 표로 제시한다. 비유는 정확성보다 **이해의 다리** 목적임을 의식.

### NestJS
| 백엔드 개념 | FE 비유 | 한 줄 |
|---|---|---|
| Module (`*.module.ts`) | FSD 슬라이스 `index.ts` 배럴 | 관련 부품 묶고 내부/공개(`providers`/`exports`) 구분 |
| Controller (`*.controller.ts`) | expo-router 라우트 파일 / Next API route | "이 URL = 이 함수" 엔드포인트 정의 |
| Guard (`*.guard.ts`) | `<ProtectedRoute>` / axios 요청 인터셉터 | 핸들러 실행 **전** 통과/차단 (`canActivate` → true/throw) |
| Service (`*.service.ts`) | `shared/api`의 axios 싱글톤 / zustand store | 재사용 로직·외부 연결 담는 공유 객체 |
| Provider | Context Provider에 등록된 값 | DI 컨테이너에 "이거 주입 가능"으로 등록된 것 |
| DI (생성자 주입) | `useContext`로 값 받아 쓰기 | 직접 `new` 안 하고 `constructor(private x: X)`로 주입받음 |
| Decorator (`@Get`, `@Injectable`) | HOC / 데코레이터 | 클래스·함수·파라미터에 메타정보 부착 |
| Param decorator (`@CurrentUser()`) | 커스텀 훅 `useCurrentUser()` | 요청 컨텍스트에서 값 꺼내 핸들러 인자로 주입 |
| Pipe | zod `safeParse` / 입력 변환 | 핸들러 들어가기 전 입력 검증·변환 |
| Interceptor | axios 응답 인터셉터 | 응답을 가공·로깅·래핑 |
| Exception filter | ErrorBoundary | 에러를 잡아 일관된 응답으로 변환 |
| `OnModuleInit` | `useEffect(() => {}, [])` (마운트 1회) | 앱 부팅 시 초기화 훅 |
| DTO + `nestjs-zod` | react-hook-form + zod 스키마 | 요청 본문 타입+검증 정의 |

### Supabase / DB
| 개념 | FE 비유 | 한 줄 |
|---|---|---|
| `service_role` 키 | 관리자 마스터키 (절대 클라 노출 금지) | RLS 우회 최고 권한. **서버 전용** |
| `anon` 키 | `EXPO_PUBLIC_*`로 노출 가능한 공개 키 | 모바일이 쓰는 제한된 키 |
| RLS (Row Level Security) | 라우트 가드의 DB 행 단위 버전 | "이 행은 본인 것만 SELECT" 같은 DB 차원 보안망 |
| RPC (`execute_trade`) | 서버리스 함수 1개 호출 | 트랜잭션 로직을 DB 함수 안에서 원자적으로 |
| migration (`*.sql`) | DB 스키마의 버전 관리 커밋 | 테이블·함수·정책 변경 이력 |
| JWT | 서명된 쿠키 / 위변조 불가 토큰 | `머리.내용.서명`, 비밀키로 서명만 검증 |

### Tickr 도메인 (해당 시)
| 개념 | 한 줄 |
|---|---|
| KIS fan-out | 개발자 키 1개로 받은 시세를 모든 사용자에게 뿌림 (사용자별 키 없음) |
| WS Hub (`ws.gateway`) | KIS WS 단일 연결 → 구독자 맵으로 tick 배포 |
| `execute_trade` RPC | 체결은 이 plpgsql 함수 단일 진입 (NestJS에서 테이블 직접 mutation 금지) |
| MARKET/LIMIT | 시장가=현재가 즉시 체결 / 지정가=가격 도달 시 자체 매칭 |

> 참고 룰: [trade-rpc.md](../rules/trade-rpc.md), [monorepo-boundary.md](../rules/monorepo-boundary.md), [kr-finance.md](../rules/kr-finance.md)

## 작성 원칙

- **항상 FE 비유 먼저, 용어는 그 다음.** "Guard는 핸들러 실행 전 통과/차단을 결정하는데, FE의 `<ProtectedRoute>`와 같아요" (O) / "Guard는 CanActivate를 구현합니다" (X — 비유 없음)
- **실행 순서대로.** 파일트리·알파벳 순 금지. 요청이 흐르는 순서가 이해에 가장 좋다.
- **코드 스니펫은 핵심 라인만.** 파일 전체를 붙여넣지 말 것. 인용 후 바로 풀이.
- **보안 포인트는 반드시 명시.** 비밀키 위치, RLS, 로그 누설, service_role 범위 — 금융 앱 맥락에서 사고로 직결되는 부분.
- **모른다고 가정하되 무시하지 않기.** FE 지식은 풍부하므로 React/zod/react-query 개념은 설명 생략하고 다리로 활용.
- **끝에 후속 제안.** 한 번에 다 쏟지 말고 더 팔 주제를 제시해 학습 페이스를 사용자가 정하게. (메모리: 점진적 페이스 선호)

## 금지

- **코드 수정 금지.** 이 스킬은 설명 전용. 수정 제안은 할 수 있어도 직접 Edit/Write 하지 않는다.
- diff hunk만 보고 설명 금지 — 반드시 파일 전체 + 관련 룰 맥락 확보.
- 비유 없는 용어 나열 금지.
- 길이를 위한 길이 금지 — 각 문단은 독자가 새로 알게 되는 게 있어야.
- 추측으로 채우기 금지 — 코드에 없는 동작을 지어내지 말고, 불확실하면 "확인 필요"로 표시.

## 참고
- 대상 독자 컨텍스트: `~/.claude/projects/.../memory/user_profile.md`, `feedback_pace.md`
- Tickr 스택/구조: 프로젝트 `CLAUDE.md`, `.claude/rules/*.md`

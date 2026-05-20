# Tickr 코딩 규칙 (rules)

> 이 디렉터리는 **Tickr에서 파일을 생성·수정할 때 항상 지켜야 하는 규칙**의 단일 출처입니다. 에이전트/사람 모두 여기에 정의된 규칙을 위반하는 코드를 만들면 안 됩니다.

## 사용 원칙

- 모든 에이전트(architect, designer, executor, reviewer 등)는 **관련 작업 시작 전 해당 rule 파일을 읽고 따릅니다**.
- 규칙이 코드와 충돌하면 **규칙이 우선**. 규칙을 바꾸려면 먼저 이 디렉터리 파일을 수정하고 PR로 합의.
- 규칙이 부족하다고 느껴지면 새 rule 파일을 추가하고 README의 인덱스를 갱신.

## 우선순위

이 디렉터리(`.claude/rules/`)의 규칙이 가장 우선합니다. 그 다음:

1. `.claude/rules/*.md` ← **최우선**
2. 프로젝트 `CLAUDE.md`
3. 프로젝트 `.claude/agents/*.md`
4. 글로벌 `~/.claude/CLAUDE.md`
5. 글로벌 `~/.claude/agents/*.md`

## 인덱스

| 파일 | 적용 시점 | 요지 |
|---|---|---|
| [fsd-structure.md](./fsd-structure.md) | `apps/mobile` 코드 작성/이동 시 | FSD v2 레이어 의존 방향, slice 격리, public API |
| [react-query.md](./react-query.md) | 서버 상태 사용 시 | queryOptions 팩토리 패턴, mutation 위치, invalidate |
| [monorepo-boundary.md](./monorepo-boundary.md) | 모노레포 import 작성 시 | `@tickr/shared` vs FSD `shared` 구분, RN-only 격리 |
| [nativewind-tokens.md](./nativewind-tokens.md) | 모바일 UI 작성 시 | 색상/스페이싱/타이포 토큰만 사용, 하드코딩 금지 |
| [kr-finance.md](./kr-finance.md) | 가격/등락/주문 UI 작성 시 | 상승=빨강/하락=파랑, 통화 포맷, 호가창 표시 금지 |
| [trade-rpc.md](./trade-rpc.md) | 체결/주문 로직 작성 시 | `execute_trade` RPC 단일 진입, 시장가/지정가, RLS |
| [naming.md](./naming.md) | 슬라이스/파일/심볼 명명 시 | entity=명사, feature=동사, 케이스 컨벤션 |

## 새 규칙 추가 가이드

1. 짧고(80줄 이하 권장) 단일 주제로 작성.
2. 규칙 + **이유**(왜) + **반례**(이렇게 하지 말 것) + **올바른 예** 구조.
3. 코드 스니펫은 최소화 — 길어지면 별도 example 파일로.
4. README 인덱스 행 추가.
5. 관련 에이전트(`architect.md` 등)에 참조 링크 추가.

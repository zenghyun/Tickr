## 요약

<!-- 무엇을, 왜 (2~3줄) -->

## 변경 내용

<!-- 카테고리별 bullet -->
- 

## 관련 이슈

Closes #
Refs:

## 영향 받는 레이어

- [ ] `packages/shared`
- [ ] `apps/api`
- [ ] `apps/mobile/src/entities/*`
- [ ] `apps/mobile/src/features/*`
- [ ] `apps/mobile/src/widgets/*`
- [ ] `apps/mobile/src/pages/*`
- [ ] `apps/mobile/app/*` (route)
- [ ] `apps/mobile/src/shared/*`
- [ ] `supabase/migrations`
- [ ] `.claude/` (rules / agents / commands)

## 규칙 준수 (`.claude/rules/`)

- [ ] `fsd-structure.md` — 레이어 방향, 슬라이스 격리, public API
- [ ] `react-query.md` — queryOptions 팩토리 사용
- [ ] `monorepo-boundary.md` — `@tickr/shared` vs FSD shared, RN-only 격리
- [ ] `nativewind-tokens.md` — 토큰 클래스만, 하드코딩 없음
- [ ] `kr-finance.md` — 상승=빨강, 호가창 X, 통화 포맷
- [ ] `trade-rpc.md` — 체결은 `execute_trade` RPC 단일 진입
- [ ] `naming.md` — entity=명사, feature=동사

## 검증

- [ ] `pnpm typecheck` 통과
- [ ] `pnpm lint` 통과
- [ ] 수동 검증 시나리오 수행
  - 

## 스크린샷 / 동영상

<!-- UI 변경 시 -->

## 노트

<!-- 리뷰어가 알아야 할 것 -->

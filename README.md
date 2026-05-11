# Tickr

한국투자증권(KIS) OpenAPI 기반 **모의투자(가상 포트폴리오) 모바일 앱**.

실제 시세를 받아오는 가상 매매. 사용자는 가상 잔고로 매수/매도하고, 보유 종목의 평가금액이 실시간 시세에 따라 변동되는 것을 본다. **닫힌 베타** 용도.

## 스택

- 모바일: Expo + expo-router + React Query + zustand
- 백엔드: NestJS + Postgres (Supabase) + WebSocket
- DB/Auth: Supabase (RLS)
- 시세: 한국투자증권 KIS Developers OpenAPI (REST + WebSocket)

## 구조 (pnpm workspaces + turbo)

```
tickr/
├── apps/
│   ├── mobile/     # Expo
│   └── api/        # NestJS
└── packages/
    └── shared/     # zod 스키마 / 타입 공유
```

## 개발

```bash
pnpm install
pnpm dev            # 전체 워크스페이스 동시 실행
pnpm dev:mobile     # Expo만
pnpm dev:api        # NestJS만
```

## 문서

- [docs/PLAN.md](./docs/PLAN.md) — 전체 구현 계획서 (W1~W7 로드맵, 아키텍처, 데이터 모델 등)
- [docs/SETUP-EXTERNAL.md](./docs/SETUP-EXTERNAL.md) — KIS / Supabase / Expo 등 외부 계정·키 발급 가이드

-- ============================================================================
-- Tickr KIS 토큰 캐시 (W4, 이슈 #10)
-- 범위: kis_tokens 테이블 + RLS default-deny + updated_at trigger
--
-- 1행/env (PK env in 'mock'|'live'). NestJS service_role만 read/write.
-- 사용자/anon 접근 일체 차단 — 비밀 access_token이 담기므로 RLS default-deny.
-- ============================================================================

create table public.kis_tokens (
  env           text primary key check (env in ('mock', 'live')),
  access_token  text not null,
  expires_at    timestamptz not null,
  updated_at    timestamptz not null default now()
);

comment on table  public.kis_tokens              is 'KIS OpenAPI access_token 캐시 (mock/live 별 1행)';
comment on column public.kis_tokens.env          is 'KIS 환경 식별자. mock=모의 openapivts, live=실전 openapi';
comment on column public.kis_tokens.access_token is 'KIS access_token (24h 유효). service_role만 read/write.';
comment on column public.kis_tokens.expires_at   is 'KIS expires_in(초) 기반 계산. 만료 10분 전 cron이 갱신.';

-- updated_at 자동 갱신 — 0001에서 정의한 set_updated_at() 재사용
create trigger kis_tokens_set_updated_at
  before update on public.kis_tokens
  for each row
  execute function public.set_updated_at();

-- RLS enable. 정책 없음 → default-deny (anon/authenticated 일체 차단).
-- service_role(NestJS)는 RLS 우회.
alter table public.kis_tokens enable row level security;

-- 명시적 권한 회수 — RLS default-deny 외 추가 안전망
revoke all on public.kis_tokens from anon, authenticated;

-- service_role은 RLS를 우회하지만 PostgreSQL 레벨 grant는 별도 필요.
-- 누락 시 NestJS(KisTokenService)에서 'permission denied for table kis_tokens' 발생.
-- (symbols 마이그레이션과 동일 패턴 — Supabase CLI 미경유 수동 적용 시 default privilege가 안 붙음)
grant all on public.kis_tokens to service_role;

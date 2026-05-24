-- ============================================================================
-- Tickr 초기 마이그레이션 (W3, 이슈 #4)
-- 범위: profiles, accounts 테이블 + RLS + handle_new_user trigger
--
-- 다국 통화 설계: accounts에 cash_balance_krw + cash_balance_usd 컬럼으로 분리.
-- 신규 통화 추가는 ALTER table로 컬럼 추가(베타엔 KRW/USD만).
-- 환전(FX)은 별도 이슈에서 fx_rates + fx_trades + execute_fx_trade RPC로 도입.
--
-- 후속(W7): holdings, trades, pending_orders, execute_trade RPC
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. profiles
-- ----------------------------------------------------------------------------
-- auth.users 1:1 확장 (FK + cascade). 비밀번호 등 인증 정보는 auth.users 유지,
-- 앱 도메인 메타데이터만 여기에.
create table public.profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  email             text not null,
  nickname          text null,
  is_beta           boolean not null default true,
  display_currency  text not null default 'KRW' check (display_currency in ('KRW', 'USD')),
  created_at        timestamptz not null default now()
);

comment on table  public.profiles                  is 'Tickr 사용자 프로필 (auth.users 1:1 확장)';
comment on column public.profiles.id               is 'auth.users.id와 동일 (FK + PK)';
comment on column public.profiles.email            is '가입 이메일. OAuth provider에서 추출.';
comment on column public.profiles.nickname         is 'OAuth provider 메타데이터에서 추출. null 허용.';
comment on column public.profiles.is_beta          is '베타 참여자 여부. W8에서 admin 화이트리스트로 관리.';
comment on column public.profiles.display_currency is '총자산/수익률 표시 기본 통화. 사용자가 setting에서 변경 가능.';

-- ----------------------------------------------------------------------------
-- 2. accounts (가상 잔고 — 다국 통화)
-- ----------------------------------------------------------------------------
-- 1인 1계좌 (user_id PK). 통화별 잔고 컬럼 분리.
-- 매매는 execute_trade RPC만 mutate. 환전은 execute_fx_trade RPC(미래 이슈).
create table public.accounts (
  user_id           uuid primary key references public.profiles(id) on delete cascade,
  cash_balance_krw  numeric(20, 4) not null default 0,
  cash_balance_usd  numeric(20, 4) not null default 0,
  updated_at        timestamptz not null default now()
);

comment on table  public.accounts                  is 'Tickr 가상 잔고 (1인 1계좌, 다국 통화)';
comment on column public.accounts.cash_balance_krw is 'KRW 현금 잔고. numeric(20,4)로 정밀도 보장.';
comment on column public.accounts.cash_balance_usd is 'USD 현금 잔고. 환전(fx_trades) 또는 USD 종목 매도 시 증가.';
comment on column public.accounts.updated_at       is 'execute_trade / execute_fx_trade RPC가 명시 갱신. trigger로 안전망.';

-- accounts.updated_at 자동 갱신 함수 + trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger accounts_set_updated_at
  before update on public.accounts
  for each row
  execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 3. RLS
-- ----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.accounts enable row level security;

-- profiles: self select
create policy profiles_select_self
  on public.profiles
  for select
  using (auth.uid() = id);

-- profiles: self update (컬럼 수준 제한은 GRANT/REVOKE로 nickname, display_currency만 허용)
create policy profiles_update_self
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- profiles: insert는 trigger(security definer)만. anon/authenticated 차단.
-- 정책을 생성하지 않으면 default-deny. 별도 정책 없음.

-- accounts: self select만 허용. mutation 정책 없음 → default-deny.
-- service_role(NestJS)는 RLS 우회. anon/authenticated의 mutation은 자동 차단.
create policy accounts_select_self
  on public.accounts
  for select
  using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 4. 컬럼 수준 권한 (profiles update를 nickname + display_currency만 허용)
-- ----------------------------------------------------------------------------
-- RLS 정책은 row 단위이고 컬럼은 GRANT로 제한.
-- authenticated role은 nickname / display_currency만 UPDATE 가능.
revoke update on public.profiles from authenticated;
grant  update (nickname, display_currency) on public.profiles to authenticated;

-- select는 RLS가 row를 막으므로 전체 컬럼 GRANT 유지.
grant select on public.profiles to authenticated;
grant select on public.accounts to authenticated;

-- ----------------------------------------------------------------------------
-- 5. handle_new_user — auth.users INSERT 시 profiles + accounts seed
-- ----------------------------------------------------------------------------
-- SECURITY DEFINER로 RLS 우회. search_path를 public으로 고정해 함수 hijack 방지.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email    text;
  v_nickname text;
begin
  -- 이메일 추출: auth.users.email 우선, raw_user_meta_data fallback
  -- 둘 다 null이면 NOT NULL 제약으로 INSERT 실패 → 가입 차단 (의도적)
  v_email := coalesce(
    new.email,
    new.raw_user_meta_data->>'email'
  );

  -- 닉네임 추출: provider별 컨벤션 (Google: name/full_name, Kakao: nickname)
  v_nickname := coalesce(
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'nickname',
    new.raw_user_meta_data->>'full_name'
  );

  -- profiles seed (display_currency는 default 'KRW')
  insert into public.profiles (id, email, nickname, is_beta)
  values (new.id, v_email, v_nickname, true)
  on conflict (id) do nothing;

  -- accounts seed: KRW 1억, USD 0 (환전 기능 학습 유도)
  insert into public.accounts (user_id, cash_balance_krw, cash_balance_usd)
  values (new.id, 100000000, 0)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

comment on function public.handle_new_user is
  'auth.users INSERT trigger. profiles + accounts(KRW 1억 / USD 0) 동일 트랜잭션 seed.';

-- ----------------------------------------------------------------------------
-- 6. auth.users trigger 연결
-- ----------------------------------------------------------------------------
-- AFTER INSERT — auth.users row가 commit 직전에 완성된 상태에서 실행.
-- on conflict do nothing이라 trigger 재실행 안전.
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

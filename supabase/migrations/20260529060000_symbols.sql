-- ============================================================================
-- Tickr symbols 마이그레이션 (W4, 이슈 #11)
-- 범위: public.symbols 테이블 + pg_trgm 검색 인덱스 + RLS
--
-- 설계 메모:
-- - PK는 단일 symbol. KR(숫자 6자리) vs US(알파벳·점) 충돌 없음.
--   향후 시장 확장(HK/JP) 시점에 'EXCHANGE:CODE' prefix 마이그레이션으로 회피.
-- - 이름은 name_ko + name_en 분리(PLAN.md B절 정합). 표시명은 coalesce(name_ko, name_en).
--   둘 다 null 불가 — CHECK으로 보장.
-- - exchange는 KOSPI | KOSDAQ | NASDAQ | NYSE check. shared의 exchangeSchema와 동기화.
-- - 검색은 pg_trgm gin_trgm_ops — 한글 trigram은 자소 분해 X, 부분 매치만(베타 범위).
-- - 상장폐지는 is_active=false 마킹. DELETE 금지 — 향후 holdings/trades FK 무결성.
-- - RLS: authenticated select 허용, anon 차단(default-deny), mutation은 service_role만.
--
-- 후속:
--   #13 — SymbolsModule + GET /symbols/search
--   #14 — symbols-master.cron (일배치 sync, KIS 마스터 보강)
--   W7 — holdings/trades.symbol FK references public.symbols(symbol)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. 확장
-- ----------------------------------------------------------------------------
-- pg_trgm: ILIKE '%term%' 부분 매치를 GIN 인덱스로 가속
create extension if not exists pg_trgm;

-- ----------------------------------------------------------------------------
-- 1. symbols
-- ----------------------------------------------------------------------------
create table public.symbols (
  symbol        text        primary key,
  name_ko       text        null,
  name_en       text        null,
  exchange      text        not null check (exchange in ('KOSPI', 'KOSDAQ', 'NASDAQ', 'NYSE')),
  market        text        not null check (market in ('KR', 'US')),
  currency      text        not null check (currency in ('KRW', 'USD')),
  is_active     boolean     not null default true,
  listing_date  date        null,
  updated_at    timestamptz not null default now(),
  -- name_ko / name_en 둘 다 null 금지 — 최소 하나는 채워야 함
  constraint symbols_name_required check (name_ko is not null or name_en is not null)
);

comment on table  public.symbols              is 'Tickr 종목 마스터 (KR/US). 검색·시세·매매 FK 참조.';
comment on column public.symbols.symbol       is '종목코드. KR=숫자 6자리(005930), US=알파벳/점(AAPL, BRK.B). 단일 PK.';
comment on column public.symbols.name_ko      is '한글명. KR 종목 필수, US 종목은 null 가능.';
comment on column public.symbols.name_en      is '영문명. US 종목 필수, KR 종목도 있으면 채움(검색 보조).';
comment on column public.symbols.exchange     is 'KOSPI | KOSDAQ | NASDAQ | NYSE. shared exchangeSchema와 동기화.';
comment on column public.symbols.market       is 'KR | US. 신규 시장 추가는 check + shared marketSchema 동시 갱신.';
comment on column public.symbols.currency     is 'KRW | USD. 표시·체결 통화. accounts.cash_balance_{krw,usd}와 일치.';
comment on column public.symbols.is_active    is '상장 여부. 상장폐지 시 false (DELETE 금지 — holdings/trades 무결성).';
comment on column public.symbols.listing_date is '상장일. KIS 마스터 미제공 시 null 허용.';
comment on column public.symbols.updated_at   is 'import 스크립트가 upsert 시 명시 갱신. 트리거로 안전망.';

-- ----------------------------------------------------------------------------
-- 2. updated_at 자동 갱신
-- ----------------------------------------------------------------------------
-- set_updated_at 함수는 init.sql에도 동일 정의가 있지만,
-- 원격에서 init이 부분 적용됐을 가능성에 대비해 idempotent하게 재정의(replace).
-- 함수 시그니처/동작은 init.sql과 동일해야 함 — drift 시 양쪽 같이 수정.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger symbols_set_updated_at
  before update on public.symbols
  for each row
  execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 3. 인덱스
-- ----------------------------------------------------------------------------
-- 한글명 부분 매치 (예: ILIKE '%삼성%')
-- partial index: name_ko가 NULL인 row(US 종목 다수)는 인덱스에서 제외 — 인덱스 크기/플래너 효율 개선.
create index idx_symbols_name_ko_trgm
  on public.symbols
  using gin (name_ko gin_trgm_ops)
  where name_ko is not null;

-- 영문명 부분 매치 (예: ILIKE '%Apple%')
-- partial index: name_en이 NULL인 row(KR 종목 일부)는 인덱스에서 제외.
create index idx_symbols_name_en_trgm
  on public.symbols
  using gin (name_en gin_trgm_ops)
  where name_en is not null;

-- 종목코드 부분 매치 (예: 'AAP%', '005%')
create index idx_symbols_symbol_trgm
  on public.symbols
  using gin (symbol gin_trgm_ops);

-- 시장 필터 + 활성 필터 (#13 검색에서 market=? AND is_active=true)
create index idx_symbols_market_active
  on public.symbols (market, is_active);

-- ----------------------------------------------------------------------------
-- 4. RLS
-- ----------------------------------------------------------------------------
alter table public.symbols enable row level security;

-- authenticated select 허용 (검색·상세 조회).
-- anon은 정책 미생성 → default-deny. 로그인 후 검색 진입이 PLAN.md IA.
-- service_role은 RLS 우회 — import 스크립트 / #14 cron이 사용.
-- mutation 정책 없음 → authenticated의 insert/update/delete 자동 차단.
create policy symbols_select_authenticated
  on public.symbols
  for select
  to authenticated
  using (true);

grant select on public.symbols to authenticated;

-- service_role은 RLS를 우회하지만 PostgreSQL 레벨 grant는 별도 필요.
-- 누락 시 NestJS/import 스크립트에서 'permission denied for table symbols' 발생.
grant all on public.symbols to service_role;

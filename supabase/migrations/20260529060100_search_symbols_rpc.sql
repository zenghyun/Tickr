-- ============================================================================
-- search_symbols RPC 함수 (W4, 이슈 #12)
--
-- 범위: public.search_symbols(p_q, p_market, p_limit) plpgsql 함수.
-- 종목 검색 — name_ko / name_en / symbol 3축 부분 매치 + similarity 정렬.
--
-- 설계 메모:
-- - security invoker — symbols 테이블 RLS(authenticated select)에 의존.
--   apps/api는 service_role 클라이언트로 호출하므로 RLS 우회됨.
--   향후 PostgREST anon 호출 차단도 RLS로 처리.
-- - limit clamp(1..50) — shared symbolSearchQuerySchema(max 50)와 동기화.
-- - is_active=true 강제 — 상장폐지 종목은 검색 결과에서 제외(SYMBOL_INACTIVE 정합).
-- - 정렬: greatest(similarity(...)) DESC, symbol ASC tie-breaker — 결정적 ordering 보장.
-- - return 컬럼: SymbolSearchResult 스키마와 정확히 일치 — over-fetch 방지.
--
-- 호출 예:
--   select * from public.search_symbols('삼성', null, 5);
--   select * from public.search_symbols('애플', 'US', 10);
--   select * from public.search_symbols('AAPL', null, 20);
-- ============================================================================

create or replace function public.search_symbols(
  p_q       text,
  p_market  text default null,
  p_limit   int  default 20
)
returns table (
  symbol    text,
  name_ko   text,
  name_en   text,
  exchange  text,
  market    text,
  currency  text
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select
    s.symbol,
    s.name_ko,
    s.name_en,
    s.exchange,
    s.market,
    s.currency
  from public.symbols s
  where s.is_active = true
    and (p_market is null or s.market = p_market)
    and (
      s.name_ko ilike '%' || p_q || '%'
      or s.name_en ilike '%' || p_q || '%'
      or s.symbol  ilike '%' || p_q || '%'
    )
  order by
    greatest(
      similarity(coalesce(s.name_ko, ''), p_q),
      similarity(coalesce(s.name_en, ''), p_q),
      similarity(s.symbol, p_q)
    ) desc,
    s.symbol asc
  limit greatest(1, least(coalesce(p_limit, 20), 50));
$$;

comment on function public.search_symbols(text, text, int) is
  '종목 검색: name_ko/name_en/symbol 부분 매치 + similarity DESC 정렬. is_active=true 강제. limit 1..50 clamp.';

-- 권한: anon은 RLS로 차단됨. authenticated는 search 가능. service_role은 NestJS가 호출.
-- security invoker라 RLS 정책(symbols_select_authenticated)이 적용됨.
revoke all on function public.search_symbols(text, text, int) from public;
grant execute on function public.search_symbols(text, text, int) to authenticated, service_role;

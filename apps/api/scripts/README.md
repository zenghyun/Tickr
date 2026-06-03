# apps/api/scripts

NestJS 앱 외부에서 실행되는 운영 스크립트.

## `import-symbols.ts`

`public.symbols` 테이블에 정적 JSON 번들(`data/symbols-{kr,us}.json`)을 upsert.

### 실행

```bash
# 전체 임포트 (KR + US)
pnpm --filter @tickr/api db:import-symbols

# 부분 임포트 (KR만)
pnpm --filter @tickr/api db:import-symbols -- --market=KR

# dry-run (DB 변경 없이 적재 예정만 출력)
pnpm --filter @tickr/api db:import-symbols -- --dry-run

# chunk size 조정 (기본 50)
pnpm --filter @tickr/api db:import-symbols -- --chunk-size=20
```

### 환경변수

루트 `.env`에서 자동 로드:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` — 🔒 서버 전용. 절대 클라이언트에 노출 금지.

### 멱등성

`ON CONFLICT (symbol) DO UPDATE` upsert. 동일 명령 N회 실행해도 row 개수 불변, `updated_at`만 갱신.

### 상장폐지 자동 비활성화

**전체 임포트**(`--market` 미지정) 시: DB에 있고 새 JSON에 없는 종목은 `is_active=false`로 마킹. DELETE는 절대 하지 않음(향후 holdings/trades FK 무결성).

**부분 임포트**(`--market=KR` 등) 시: 다른 시장 종목을 잘못 비활성화하는 것을 막기 위해 자동 비활성화를 **스킵**한다.

## 데이터 큐레이션 정책 (#11 baseline)

이번 #11에서 적재되는 60종(KR 30 + US 30)은 **검증 가능한 핵심 종목 baseline**이다. 본격적인 코스피 100/코스닥 50/NASDAQ 100/S&P 50 범위는 **#14 cron(KIS 마스터 sync)** 에서 자동 보강 예정.

- `listingDate`는 신뢰 가능한 출처가 있는 경우만 채움. 나머지는 `null` (DB에서 nullable).
- `nameKo`: KR 종목 필수. US 종목은 보통 `null`.
- `nameEn`: 검색 보조용. 가능하면 KR 종목도 채움.

## 후속

- **#13** `/symbols/search` 엔드포인트가 이 테이블을 ILIKE + pg_trgm으로 검색.
- **#14** symbols-master cron — KIS 마스터 API 또는 `.mst` 파일 sync로 베타 범위 종목 보강.

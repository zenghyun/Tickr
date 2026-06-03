// ============================================================================
// public.symbols 테이블 임포트 스크립트 (W4, 이슈 #11)
//
// 정적 JSON 번들(scripts/data/symbols-{kr,us}.json)을 service_role 클라이언트로
// upsert. 멱등 — 재실행 안전. NestJS 컨텍스트는 사용하지 않고 가벼운 ts-node로 실행.
//
// 실행:
//   pnpm --filter @tickr/api db:import-symbols
//   pnpm --filter @tickr/api db:import-symbols -- --market=KR
//   pnpm --filter @tickr/api db:import-symbols -- --dry-run
//   pnpm --filter @tickr/api db:import-symbols -- --chunk-size=20
//
// 환경변수: 모노레포 루트 .env에서 자동 로드.
//   SUPABASE_URL                  (필수)
//   SUPABASE_SERVICE_ROLE_KEY     (필수, 🔒 서버 전용)
// ============================================================================

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { config as loadEnv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import {
  symbolDetailSchema,
  marketSchema,
  type SymbolDetail,
  type Market,
} from '@tickr/shared';

// ─── 1. env 로드 ─────────────────────────────────────────────────────────────
// __dirname = apps/api/scripts → 모노레포 루트는 ../../../ (3단계 상위)
loadEnv({ path: resolve(__dirname, '../../../.env') });

// ─── 2. CLI 인자 파싱 (외부 lib 없이) ────────────────────────────────────────
interface CliArgs {
  market: Market | null; // null = 전체
  dryRun: boolean;
  chunkSize: number;
}

function parseArgs(argv: readonly string[]): CliArgs {
  let market: Market | null = null;
  let dryRun = false;
  let chunkSize = 50;

  for (const arg of argv) {
    // pnpm/ts-node가 인자 통과 시 separator(--)를 함께 넘김 — 무시.
    if (arg === '--') continue;
    if (arg === '--dry-run') {
      dryRun = true;
      continue;
    }
    if (arg.startsWith('--market=')) {
      const raw = arg.slice('--market='.length);
      const parsed = marketSchema.safeParse(raw);
      if (!parsed.success) {
        throw new Error(
          `[args] --market 값은 'KR' 또는 'US'여야 합니다: ${raw}`,
        );
      }
      market = parsed.data;
      continue;
    }
    if (arg.startsWith('--chunk-size=')) {
      const n = Number(arg.slice('--chunk-size='.length));
      if (!Number.isInteger(n) || n < 1 || n > 500) {
        throw new Error(`[args] --chunk-size는 1~500 정수여야 합니다: ${arg}`);
      }
      chunkSize = n;
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
    throw new Error(`[args] 알 수 없는 인자: ${arg}`);
  }

  return { market, dryRun, chunkSize };
}

function printHelp(): void {
  console.log(`
사용법:
  ts-node scripts/import-symbols.ts [options]

옵션:
  --market=KR|US        해당 시장만 임포트 (생략 시 KR+US 전체)
  --dry-run             DB 변경 없이 적재 예정만 출력
  --chunk-size=N        upsert chunk 크기 (기본 50, 1~500)
  --help, -h            이 도움말 출력
`);
}

// ─── 3. env helper ──────────────────────────────────────────────────────────
function requireEnv(key: string): string {
  const v = process.env[key];
  if (!v || v.trim() === '') {
    throw new Error(
      `[env] ${key}가 비어있습니다. 모노레포 루트 .env를 확인하세요.`,
    );
  }
  return v;
}

// ─── 4. DB row 타입 + 매핑 ──────────────────────────────────────────────────
// camelCase(SymbolDetail) → snake_case(DB 컬럼) 변환.
// `as` 단언 없이 명시 필드 매핑으로 타입 안전 유지.
interface SymbolRow {
  symbol: string;
  name_ko: string | null;
  name_en: string | null;
  exchange: SymbolDetail['exchange'];
  market: SymbolDetail['market'];
  currency: SymbolDetail['currency'];
  is_active: boolean;
  listing_date: string | null;
}

function toDbRow(s: SymbolDetail): SymbolRow {
  return {
    symbol: s.symbol,
    name_ko: s.nameKo,
    name_en: s.nameEn,
    exchange: s.exchange,
    market: s.market,
    currency: s.currency,
    is_active: s.isActive,
    listing_date: s.listingDate,
  };
}

// ─── 5. 파일 입력 스키마 ────────────────────────────────────────────────────
const inputFileSchema = z.array(symbolDetailSchema).min(1);

// ─── 6. utils ───────────────────────────────────────────────────────────────
function chunked<T>(arr: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

async function loadSymbolFile(filename: string): Promise<SymbolDetail[]> {
  const path = resolve(__dirname, 'data', filename);
  const raw = await readFile(path, 'utf8');
  const json: unknown = JSON.parse(raw);
  const parsed = inputFileSchema.safeParse(json);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`[file] ${filename} 검증 실패:\n${issues}`);
  }
  return parsed.data;
}

// ─── 7. 메인 ────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  const url = requireEnv('SUPABASE_URL');
  const serviceRole = requireEnv('SUPABASE_SERVICE_ROLE_KEY');

  const sb = createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const files: { filename: string; market: Market }[] =
    args.market === null
      ? [
          { filename: 'symbols-kr.json', market: 'KR' },
          { filename: 'symbols-us.json', market: 'US' },
        ]
      : args.market === 'KR'
        ? [{ filename: 'symbols-kr.json', market: 'KR' }]
        : [{ filename: 'symbols-us.json', market: 'US' }];

  console.log(
    `[start] mode=${args.dryRun ? 'dry-run' : 'write'} market=${args.market ?? 'ALL'} chunkSize=${args.chunkSize}`,
  );

  const allLoadedSymbols = new Set<string>();
  let totalUpserted = 0;
  let hasErrors = false;

  for (const { filename, market } of files) {
    const symbols = await loadSymbolFile(filename);
    console.log(`[file] ${filename} loaded=${symbols.length} market=${market}`);

    // 파일이 선언한 market과 각 row의 market 정합 검사
    const mismatched = symbols.filter((s) => s.market !== market);
    if (mismatched.length > 0) {
      throw new Error(
        `[file] ${filename}에 market!=${market}인 row ${mismatched.length}개 — ${mismatched
          .slice(0, 3)
          .map((s) => s.symbol)
          .join(', ')}`,
      );
    }

    const rows = symbols.map(toDbRow);

    for (const chunk of chunked(rows, args.chunkSize)) {
      if (args.dryRun) {
        console.log(
          `  [dry-run] would upsert ${chunk.length} rows (first=${chunk[0].symbol})`,
        );
        continue;
      }

      const { error } = await sb
        .from('symbols')
        .upsert(chunk, { onConflict: 'symbol', ignoreDuplicates: false });

      if (error) {
        console.error(
          `  [error] chunk first=${chunk[0].symbol} failed: ${error.message}`,
        );
        hasErrors = true;
        continue;
      }
      totalUpserted += chunk.length;
    }

    for (const s of symbols) {
      allLoadedSymbols.add(s.symbol);
    }
  }

  // 상장폐지 자동 비활성화 — 전체 임포트(--market 미지정) 시에만 수행.
  // 부분 임포트 시는 다른 시장 종목을 잘못 비활성화하는 것을 막기 위해 스킵.
  if (args.market === null && !args.dryRun && !hasErrors) {
    const { data: existing, error: selErr } = await sb
      .from('symbols')
      .select('symbol')
      .eq('is_active', true);

    if (selErr) {
      console.error(`[deactivate] select 실패: ${selErr.message}`);
      hasErrors = true;
    } else {
      const existingRows = existing ?? [];
      const toDeactivate: string[] = [];
      for (const row of existingRows) {
        const sym = row.symbol;
        if (typeof sym === 'string' && !allLoadedSymbols.has(sym)) {
          toDeactivate.push(sym);
        }
      }

      if (toDeactivate.length > 0) {
        console.warn(
          `[deactivate] ${toDeactivate.length} delisted symbols → is_active=false`,
        );
        const { error: updErr } = await sb
          .from('symbols')
          .update({ is_active: false })
          .in('symbol', toDeactivate);
        if (updErr) {
          console.error(`[deactivate] update 실패: ${updErr.message}`);
          hasErrors = true;
        }
      } else {
        console.log('[deactivate] 비활성화할 종목 없음');
      }
    }
  }

  if (args.dryRun) {
    console.log(`[done] dry-run 완료. (write 모드로 다시 실행하세요)`);
  } else {
    console.log(`[done] upserted=${totalUpserted} hasErrors=${hasErrors}`);
  }

  process.exit(hasErrors ? 1 : 0);
}

main().catch((e: unknown) => {
  const msg = e instanceof Error ? e.message : String(e);
  console.error(`[fatal] ${msg}`);
  process.exit(1);
});

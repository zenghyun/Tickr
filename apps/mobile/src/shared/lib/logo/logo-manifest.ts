// 로고 매니페스트 — KR 14 + US 36 = 50종목 (시총 상위 2026-05 기준)
//
// 정적 require 매핑이 이 파일의 핵심 역할이다. Metro 번들러는 require 인자가 리터럴 문자열일 때만
// 정적 그래프에 포함하므로, 동적 경로(`require(\`${sym}.png\`)`)는 금지.
//
// 사용 방식:
//   1. `apps/mobile/assets/logos/{symbol}.png` 에 PNG 추가 (256x256 권장, 투명 배경).
//   2. 아래 LOGO_SOURCES의 해당 라인 주석 해제.
//   3. 매니페스트에 없는 심볼은 LogoFallback(이니셜 원형)으로 대체 — getLogo()가 undefined 반환.
//
// 상표권: 닫힌 베타 한정 사용. 공개 배포 전 재검토 (docs/PLAN.md K절).

import type { LogoSource, LogoSymbol } from './types';

/**
 * 심볼 → 정적 require 매핑.
 * 빈 객체로 시작 — 사용자가 PNG 수집할 때마다 주석 해제 후 빌드.
 */
export const LOGO_SOURCES: Readonly<Record<LogoSymbol, LogoSource>> = {
  // ─── KR 14 (코스피 시총 상위, ThorKit 2026) ─────────────────────────────
  // '005930': require('../../../../assets/logos/005930.png'), // 삼성전자
  // '000660': require('../../../../assets/logos/000660.png'), // SK하이닉스
  // '373220': require('../../../../assets/logos/373220.png'), // LG에너지솔루션
  // '207940': require('../../../../assets/logos/207940.png'), // 삼성바이오로직스
  // '005380': require('../../../../assets/logos/005380.png'), // 현대차
  // '000270': require('../../../../assets/logos/000270.png'), // 기아
  // '068270': require('../../../../assets/logos/068270.png'), // 셀트리온
  // '006400': require('../../../../assets/logos/006400.png'), // 삼성SDI
  // '005490': require('../../../../assets/logos/005490.png'), // POSCO홀딩스
  // '035420': require('../../../../assets/logos/035420.png'), // NAVER
  // '035720': require('../../../../assets/logos/035720.png'), // 카카오
  // '012330': require('../../../../assets/logos/012330.png'), // 현대모비스
  // '051910': require('../../../../assets/logos/051910.png'), // LG화학
  // '032830': require('../../../../assets/logos/032830.png'), // 삼성생명

  // ─── US 36 (S&P 500 시총 상위, disfold 2026-01) ─────────────────────────
  // 'nvda':  require('../../../../assets/logos/nvda.png'),   // NVIDIA
  // 'aapl':  require('../../../../assets/logos/aapl.png'),   // Apple
  // 'googl': require('../../../../assets/logos/googl.png'),  // Alphabet
  // 'msft':  require('../../../../assets/logos/msft.png'),   // Microsoft
  // 'amzn':  require('../../../../assets/logos/amzn.png'),   // Amazon
  // 'avgo':  require('../../../../assets/logos/avgo.png'),   // Broadcom
  // 'meta':  require('../../../../assets/logos/meta.png'),   // Meta Platforms
  // 'tsla':  require('../../../../assets/logos/tsla.png'),   // Tesla
  // 'brk-b': require('../../../../assets/logos/brk-b.png'),  // Berkshire Hathaway B
  // 'lly':   require('../../../../assets/logos/lly.png'),    // Eli Lilly
  // 'wmt':   require('../../../../assets/logos/wmt.png'),    // Walmart
  // 'jpm':   require('../../../../assets/logos/jpm.png'),    // JPMorgan
  // 'v':     require('../../../../assets/logos/v.png'),      // Visa
  // 'orcl':  require('../../../../assets/logos/orcl.png'),   // Oracle
  // 'xom':   require('../../../../assets/logos/xom.png'),    // Exxon Mobil
  // 'ma':    require('../../../../assets/logos/ma.png'),     // Mastercard
  // 'jnj':   require('../../../../assets/logos/jnj.png'),    // Johnson & Johnson
  // 'bac':   require('../../../../assets/logos/bac.png'),    // Bank of America
  // 'abbv':  require('../../../../assets/logos/abbv.png'),   // AbbVie
  // 'nflx':  require('../../../../assets/logos/nflx.png'),   // Netflix
  // 'cost':  require('../../../../assets/logos/cost.png'),   // Costco
  // 'amd':   require('../../../../assets/logos/amd.png'),    // AMD
  // 'mu':    require('../../../../assets/logos/mu.png'),     // Micron
  // 'hd':    require('../../../../assets/logos/hd.png'),     // Home Depot
  // 'ge':    require('../../../../assets/logos/ge.png'),     // General Electric
  // 'pg':    require('../../../../assets/logos/pg.png'),     // Procter & Gamble
  // 'cvx':   require('../../../../assets/logos/cvx.png'),    // Chevron
  // 'wfc':   require('../../../../assets/logos/wfc.png'),    // Wells Fargo
  // 'unh':   require('../../../../assets/logos/unh.png'),    // UnitedHealth
  // 'csco':  require('../../../../assets/logos/csco.png'),   // Cisco
  // 'ko':    require('../../../../assets/logos/ko.png'),     // Coca-Cola
  // 'ms':    require('../../../../assets/logos/ms.png'),     // Morgan Stanley
  // 'cat':   require('../../../../assets/logos/cat.png'),    // Caterpillar
  // 'gs':    require('../../../../assets/logos/gs.png'),     // Goldman Sachs
  // 'ibm':   require('../../../../assets/logos/ibm.png'),    // IBM
  // 'mrk':   require('../../../../assets/logos/mrk.png'),    // Merck
};

/**
 * 로그인 마키 표시용 심볼 시퀀스 (50개).
 * 위젯이 useMemo로 한 번 셔플 후 2행에 분할한다.
 * LOGO_SOURCES에 require가 없는 심볼은 LogoFallback으로 자동 대체.
 */
export const MARQUEE_LOGO_SET: readonly LogoSymbol[] = [
  // KR 14
  '005930', '000660', '373220', '207940', '005380', '000270', '068270',
  '006400', '005490', '035420', '035720', '012330', '051910', '032830',
  // US 36
  'nvda', 'aapl', 'googl', 'msft', 'amzn', 'avgo', 'meta', 'tsla', 'brk-b',
  'lly', 'wmt', 'jpm', 'v', 'orcl', 'xom', 'ma', 'jnj', 'bac', 'abbv',
  'nflx', 'cost', 'amd', 'mu', 'hd', 'ge', 'pg', 'cvx', 'wfc', 'unh',
  'csco', 'ko', 'ms', 'cat', 'gs', 'ibm', 'mrk',
] as const;

/**
 * 안전한 로고 lookup. 매니페스트에 없는 심볼은 `undefined` 반환.
 * @example
 *   const src = getLogo('005930');
 *   src ? <Image source={src} /> : <LogoFallback symbol="005930" />
 */
export const getLogo = (symbol: LogoSymbol): LogoSource | undefined => {
  return LOGO_SOURCES[symbol];
};

/**
 * 인덱스 기반 결정론적 opacity (0.4~0.7).
 * Math.random 대신 인덱스 seed를 써서 매 렌더 동일 값 보장 — flickering 방지.
 */
export const seedOpacity = (index: number): number => {
  // 정수 해시 후 0~1로 정규화, 범위 0.4~0.7로 매핑
  const hash = ((index * 2654435761) >>> 0) / 0xffffffff;
  return 0.4 + hash * 0.3;
};

// 로고 정적 매니페스트 — FMP에서 다운로드된 PNG (KR 30 + US 70 = 100).
// 파일: apps/mobile/assets/logos/{symbol}.png
//
// Metro 정적 require 분석을 위해 리터럴 경로 사용 — 동적 경로(`require(\`./${sym}\`)`) 금지.
// 번들 사이즈: ~1.3MB. 빌드 시 모두 포함 → 첫 프레임부터 즉시 표시(prefetch 불필요).
//
// 변경 시:
// 1. apps/mobile/assets/logos/{symbol}.png 추가
// 2. LOGO_SOURCES + MARQUEE_LOGO_SET 양쪽 갱신 (순서 일치 권장)
// 3. KR 형식: '{6자리코드}.KS', US 형식: 대문자 ticker

import type { LogoSource, LogoSymbol } from "./types";

export const LOGO_SOURCES: Readonly<Record<LogoSymbol, LogoSource>> = {
  // ─── KR 30 (코스피 시총 상위) ─────────────────────────
  "005930.KS": require("../../../../assets/logos/005930.KS.png"), // 삼성전자
  "000660.KS": require("../../../../assets/logos/000660.KS.png"), // SK하이닉스
  "373220.KS": require("../../../../assets/logos/373220.KS.png"), // LG에너지솔루션
  "207940.KS": require("../../../../assets/logos/207940.KS.png"), // 삼성바이오로직스
  "005380.KS": require("../../../../assets/logos/005380.KS.png"), // 현대차
  "000270.KS": require("../../../../assets/logos/000270.KS.png"), // 기아
  "068270.KS": require("../../../../assets/logos/068270.KS.png"), // 셀트리온
  "006400.KS": require("../../../../assets/logos/006400.KS.png"), // 삼성SDI
  "005490.KS": require("../../../../assets/logos/005490.KS.png"), // POSCO홀딩스
  "035420.KS": require("../../../../assets/logos/035420.KS.png"), // NAVER
  "035720.KS": require("../../../../assets/logos/035720.KS.png"), // 카카오
  "012330.KS": require("../../../../assets/logos/012330.KS.png"), // 현대모비스
  "032830.KS": require("../../../../assets/logos/032830.KS.png"), // 삼성생명
  "105560.KS": require("../../../../assets/logos/105560.KS.png"), // KB금융
  "055550.KS": require("../../../../assets/logos/055550.KS.png"), // 신한지주
  "086790.KS": require("../../../../assets/logos/086790.KS.png"), // 하나금융지주
  "033780.KS": require("../../../../assets/logos/033780.KS.png"), // KT&G
  "003550.KS": require("../../../../assets/logos/003550.KS.png"), // LG
  "015760.KS": require("../../../../assets/logos/015760.KS.png"), // 한국전력
  "329180.KS": require("../../../../assets/logos/329180.KS.png"), // HD현대중공업
  "000810.KS": require("../../../../assets/logos/000810.KS.png"), // 삼성화재
  "017670.KS": require("../../../../assets/logos/017670.KS.png"), // SK텔레콤 (대체)
  "051900.KS": require("../../../../assets/logos/051900.KS.png"), // LG생활건강
  "259960.KS": require("../../../../assets/logos/259960.KS.png"), // 크래프톤 (대체)
  "316140.KS": require("../../../../assets/logos/316140.KS.png"), // 우리금융지주
  "323410.KS": require("../../../../assets/logos/323410.KS.png"), // 카카오뱅크 (대체)

  // ─── US 70 (S&P500 시총 상위) ─────────────────────────
  NVDA: require("../../../../assets/logos/NVDA.png"),
  AAPL: require("../../../../assets/logos/AAPL.png"),
  GOOGL: require("../../../../assets/logos/GOOGL.png"),
  MSFT: require("../../../../assets/logos/MSFT.png"),
  AMZN: require("../../../../assets/logos/AMZN.png"),
  AVGO: require("../../../../assets/logos/AVGO.png"),
  META: require("../../../../assets/logos/META.png"),
  TSLA: require("../../../../assets/logos/TSLA.png"),
  "BRK.B": require("../../../../assets/logos/BRK.B.png"),
  LLY: require("../../../../assets/logos/LLY.png"),
  WMT: require("../../../../assets/logos/WMT.png"),
  JPM: require("../../../../assets/logos/JPM.png"),
  V: require("../../../../assets/logos/V.png"),
  ORCL: require("../../../../assets/logos/ORCL.png"),
  XOM: require("../../../../assets/logos/XOM.png"),
  MA: require("../../../../assets/logos/MA.png"),
  JNJ: require("../../../../assets/logos/JNJ.png"),
  BAC: require("../../../../assets/logos/BAC.png"),
  ABBV: require("../../../../assets/logos/ABBV.png"),
  NFLX: require("../../../../assets/logos/NFLX.png"),
  COST: require("../../../../assets/logos/COST.png"),
  AMD: require("../../../../assets/logos/AMD.png"),
  MU: require("../../../../assets/logos/MU.png"),
  HD: require("../../../../assets/logos/HD.png"),
  GE: require("../../../../assets/logos/GE.png"),
  PG: require("../../../../assets/logos/PG.png"),
  CVX: require("../../../../assets/logos/CVX.png"),
  WFC: require("../../../../assets/logos/WFC.png"),
  UNH: require("../../../../assets/logos/UNH.png"),
  CSCO: require("../../../../assets/logos/CSCO.png"),
  KO: require("../../../../assets/logos/KO.png"),
  MS: require("../../../../assets/logos/MS.png"),
  CAT: require("../../../../assets/logos/CAT.png"),
  GS: require("../../../../assets/logos/GS.png"),
  IBM: require("../../../../assets/logos/IBM.png"),
  MRK: require("../../../../assets/logos/MRK.png"),
  CRM: require("../../../../assets/logos/CRM.png"),
  NOW: require("../../../../assets/logos/NOW.png"),
  PFE: require("../../../../assets/logos/PFE.png"),
  INTC: require("../../../../assets/logos/INTC.png"),
  T: require("../../../../assets/logos/T.png"),
  VZ: require("../../../../assets/logos/VZ.png"),
  CMCSA: require("../../../../assets/logos/CMCSA.png"),
  DIS: require("../../../../assets/logos/DIS.png"),
  NKE: require("../../../../assets/logos/NKE.png"),
  MCD: require("../../../../assets/logos/MCD.png"),
  SBUX: require("../../../../assets/logos/SBUX.png"),
  PEP: require("../../../../assets/logos/PEP.png"),
  ADBE: require("../../../../assets/logos/ADBE.png"),
  QCOM: require("../../../../assets/logos/QCOM.png"),
  TXN: require("../../../../assets/logos/TXN.png"),
  AMAT: require("../../../../assets/logos/AMAT.png"),
  PYPL: require("../../../../assets/logos/PYPL.png"),
  BA: require("../../../../assets/logos/BA.png"),
  UNP: require("../../../../assets/logos/UNP.png"),
  UPS: require("../../../../assets/logos/UPS.png"),
  RTX: require("../../../../assets/logos/RTX.png"),
  LMT: require("../../../../assets/logos/LMT.png"),
  AMGN: require("../../../../assets/logos/AMGN.png"),
  BLK: require("../../../../assets/logos/BLK.png"),
  SCHW: require("../../../../assets/logos/SCHW.png"),
  C: require("../../../../assets/logos/C.png"),
  SPGI: require("../../../../assets/logos/SPGI.png"),
  MMM: require("../../../../assets/logos/MMM.png"),
  DE: require("../../../../assets/logos/DE.png"),
  F: require("../../../../assets/logos/F.png"),
  GM: require("../../../../assets/logos/GM.png"),
  UBER: require("../../../../assets/logos/UBER.png"),
  PLTR: require("../../../../assets/logos/PLTR.png"),
  SHOP: require("../../../../assets/logos/SHOP.png"),
};

export const MARQUEE_LOGO_SET: readonly LogoSymbol[] = [
  // KR 30
  "005930.KS",
  "000660.KS",
  "373220.KS",
  "207940.KS",
  "005380.KS",
  "000270.KS",
  "068270.KS",
  "006400.KS",
  "005490.KS",
  "035420.KS",
  "035720.KS",
  "012330.KS",
  "032830.KS",
  "105560.KS",
  "055550.KS",
  "086790.KS",
  "033780.KS",
  "003550.KS",
  "015760.KS",
  "329180.KS",
  "000810.KS",
  "017670.KS",
  "051900.KS",
  "259960.KS",
  "316140.KS",
  "323410.KS",
  // US 70
  "NVDA",
  "AAPL",
  "GOOGL",
  "MSFT",
  "AMZN",
  "AVGO",
  "META",
  "TSLA",
  "BRK.B",
  "LLY",
  "WMT",
  "JPM",
  "V",
  "ORCL",
  "XOM",
  "MA",
  "JNJ",
  "BAC",
  "ABBV",
  "NFLX",
  "COST",
  "AMD",
  "MU",
  "HD",
  "GE",
  "PG",
  "CVX",
  "WFC",
  "UNH",
  "CSCO",
  "KO",
  "MS",
  "CAT",
  "GS",
  "IBM",
  "MRK",
  "CRM",
  "NOW",
  "PFE",
  "INTC",
  "T",
  "VZ",
  "CMCSA",
  "DIS",
  "NKE",
  "MCD",
  "SBUX",
  "PEP",
  "ADBE",
  "QCOM",
  "TXN",
  "AMAT",
  "PYPL",
  "BA",
  "UNP",
  "UPS",
  "RTX",
  "LMT",
  "AMGN",
  "BLK",
  "SCHW",
  "C",
  "SPGI",
  "MMM",
  "DE",
  "F",
  "GM",
  "UBER",
  "PLTR",
  "SHOP",
] as const;

/** 안전한 로고 lookup. 매니페스트에 없는 심볼은 undefined → LogoFallback. */
export const getLogo = (symbol: LogoSymbol): LogoSource | undefined => {
  return LOGO_SOURCES[symbol];
};

/**
 * 인덱스 기반 결정론적 opacity (0.4~0.7).
 * Math.random 대신 인덱스 seed를 써서 매 렌더 동일 값 보장 — flickering 방지.
 */
export const seedOpacity = (index: number): number => {
  const hash = ((index * 2654435761) >>> 0) / 0xffffffff;
  return 0.4 + hash * 0.3;
};

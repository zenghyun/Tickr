// KIS OpenAPI 응답 타입
// 공식 문서: https://apiportal.koreainvestment.com/apiservice
// NOTE: KIS 응답 필드명은 도메인 약어(`stck_prpr` 등). 서버에서 도메인 타입으로 매핑 후 모바일에 전달.

// 토큰 발급 응답
export interface KisTokenResponse {
  access_token: string;
  access_token_token_expired: string;  // 'YYYY-MM-DD HH:mm:ss'
  token_type: 'Bearer';
  expires_in: number;                   // 초
}

// 현재가 조회 응답 (FHKST01010100)
export interface KisQuoteResponse {
  rt_cd: string;                        // '0' = 성공
  msg_cd: string;
  msg1: string;
  output: {
    stck_prpr: string;                  // 현재가
    prdy_vrss: string;                  // 전일 대비
    prdy_ctrt: string;                  // 전일 대비 등락률 %
    stck_oprc: string;                  // 시가
    stck_hgpr: string;                  // 고가
    stck_lwpr: string;                  // 저가
    acml_vol: string;                   // 누적 거래량
    stck_prdy_clpr: string;             // 전일 종가
    [key: string]: string;
  };
}

// 분/일봉 응답 (FHKST03010200 등)
export interface KisCandleItem {
  stck_bsop_date: string;               // YYYYMMDD
  stck_clpr: string;                    // 종가
  stck_oprc: string;                    // 시가
  stck_hgpr: string;                    // 고가
  stck_lwpr: string;                    // 저가
  acml_vol: string;                     // 거래량
}

export interface KisCandleResponse {
  rt_cd: string;
  msg_cd: string;
  msg1: string;
  output1: Record<string, string>;
  output2: KisCandleItem[];
}

// WS 실시간 응답 raw (KIS는 `|` 구분 문자열로 옴)
// 파싱 후 ws-protocol.ts의 ServerMessage('tick')로 변환됨.
export interface KisWsRawTick {
  symbol: string;
  price: number;
  ts: number;
}

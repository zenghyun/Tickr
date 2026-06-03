// KIS REST 호출 어댑터 — 현재가/캔들 raw 호출 + 도메인 매핑.
//
// 책임: KIS HTTP 디테일(path/tr_id/헤더/query)만. 토큰/baseUrl은 KisTokenService 위임.
// 캐시·dedup·502 정규화는 상위 QuoteService 책임(여기선 실패 시 그대로 throw).
//
// tr_id (국내주식, 모의/실전 공통):
// - 현재가: FHKST01010100  /uapi/domestic-stock/v1/quotations/inquire-price
// - 일봉:   FHKST03010100  /uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice
// - 분봉:   FHKST03010200  /uapi/domestic-stock/v1/quotations/inquire-time-itemchartprice
//
// 한도: KIS 모의 REST 2 req/s — 상위 캐시/dedup으로 흡수. 비밀(appsecret) 로깅 금지.
// 참고: docs/PLAN.md E절, kis-token.service.ts(토큰 제공).
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import type { CandleInterval, Candle, Quote } from '@tickr/shared';
import type { Env } from '../config/env.validation';
import { KisTokenService } from './kis-token.service';
import { toDailyCandles, toMinuteCandles, toQuote } from './kis-rest.mapper';

const PATH = {
  quote: '/uapi/domestic-stock/v1/quotations/inquire-price',
  daily: '/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice',
  minute: '/uapi/domestic-stock/v1/quotations/inquire-time-itemchartprice',
} as const;

const TR_ID = {
  quote: 'FHKST01010100',
  daily: 'FHKST03010100',
  minute: 'FHKST03010200',
} as const;

const MARKET_DIV = 'J'; // 국내주식
const REQUEST_TIMEOUT_MS = 10_000;

@Injectable()
export class KisRestService {
  private readonly logger = new Logger(KisRestService.name);

  constructor(
    private readonly token: KisTokenService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /** 현재가 단건 조회 → Quote. KIS 실패/shape drift 시 throw. */
  async getQuote(symbol: string): Promise<Quote> {
    const data = await this.get(PATH.quote, TR_ID.quote, {
      FID_COND_MRKT_DIV_CODE: MARKET_DIV,
      FID_INPUT_ISCD: symbol,
    });
    return toQuote(symbol, data);
  }

  /** 캔들 조회 → Candle[](오름차순). interval에 따라 일봉/분봉 API 분기. */
  async getCandles(
    symbol: string,
    interval: CandleInterval,
    limit: number,
  ): Promise<Candle[]> {
    return interval === '1d'
      ? this.getDailyCandles(symbol, limit)
      : this.getMinuteCandles(symbol, limit);
  }

  // -------------------------------------------------------------------------
  // private
  // -------------------------------------------------------------------------

  private async getDailyCandles(
    symbol: string,
    limit: number,
  ): Promise<Candle[]> {
    const { date: end } = this.kstNow();
    // 주말/휴장 버퍼로 limit의 ~2배 일수만큼 과거를 시작점으로(단일 호출, KIS는 ~100건 cap).
    const start = this.kstDateDaysAgo(limit * 2);
    const data = await this.get(PATH.daily, TR_ID.daily, {
      FID_COND_MRKT_DIV_CODE: MARKET_DIV,
      FID_INPUT_ISCD: symbol,
      FID_INPUT_DATE_1: start,
      FID_INPUT_DATE_2: end,
      FID_PERIOD_DIV_CODE: 'D',
      FID_ORG_ADJ_PRC: '0', // 수정주가 반영
    });
    return toDailyCandles(data, limit);
  }

  private async getMinuteCandles(
    symbol: string,
    limit: number,
  ): Promise<Candle[]> {
    const { time } = this.kstNow();
    const data = await this.get(PATH.minute, TR_ID.minute, {
      FID_ETC_CLS_CODE: '',
      FID_COND_MRKT_DIV_CODE: MARKET_DIV,
      FID_INPUT_ISCD: symbol,
      FID_INPUT_HOUR_1: time,
      FID_PW_DATA_INCU_YN: 'Y',
    });
    return toMinuteCandles(data, limit);
  }

  /** KIS GET 공통 — 토큰/헤더 구성, axios 호출. 응답 body(unknown) 반환. */
  private async get(
    path: string,
    trId: string,
    params: Record<string, string>,
  ): Promise<unknown> {
    const accessToken = await this.token.getToken();
    // 명시 string 타입으로 받아 ConfigService.get의 infer 오버로드를 string으로 고정
    // (헤더 객체 리터럴 컨텍스트에서는 any로 추론됨 — kis-token.service는 string 필드 대입으로 회피).
    const appkey: string = this.config.get('KIS_APP_KEY', { infer: true });
    const appsecret: string = this.config.get('KIS_APP_SECRET', {
      infer: true,
    });
    const res = await axios.get<unknown>(`${this.token.getBaseUrl()}${path}`, {
      params,
      timeout: REQUEST_TIMEOUT_MS,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        authorization: `Bearer ${accessToken}`,
        appkey,
        appsecret,
        tr_id: trId,
        custtype: 'P', // 개인
      },
    });
    return res.data;
  }

  /** 현재 KST 시각 → { date:'YYYYMMDD', time:'HHMMSS' }. */
  private kstNow(): { date: string; time: string } {
    const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
    const date = `${kst.getUTCFullYear()}${pad(kst.getUTCMonth() + 1)}${pad(kst.getUTCDate())}`;
    const time = `${pad(kst.getUTCHours())}${pad(kst.getUTCMinutes())}${pad(kst.getUTCSeconds())}`;
    return { date, time };
  }

  /** n일 전 KST 날짜 'YYYYMMDD'. */
  private kstDateDaysAgo(n: number): string {
    const kst = new Date(Date.now() + 9 * 60 * 60 * 1000 - n * 86_400_000);
    return `${kst.getUTCFullYear()}${pad(kst.getUTCMonth() + 1)}${pad(kst.getUTCDate())}`;
  }
}

const pad = (n: number): string => String(n).padStart(2, '0');

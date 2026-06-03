// KIS REST 호출 어댑터 — 현재가/캔들 raw 호출 + 도메인 매핑.
//
// 책임: KIS HTTP 디테일(path/tr_id/헤더/query)만. 토큰/baseUrl은 KisTokenService 위임.
// 캐시·dedup·502 정규화는 상위 QuoteService 책임(여기선 실패 시 그대로 throw).
//
// 국내(KR, domestic-stock) / 해외(US, overseas-price) tr_id — 모의/실전 공통:
// KR 현재가 FHKST01010100 / 일봉 FHKST03010100 / 분봉 FHKST03010200
// US 현재가 HHDFS00000300 / 일봉 HHDFS76240000 / 분봉 HHDFS76950200
//
// 시장 라우팅: 호출측(QuoteService)이 symbols 테이블에서 market/exchange를 조회해 전달.
// 한도: KIS 모의 REST 한도 — rate-limiter로 호출 간격 이격(+EGW00201 재시도). 비밀 로깅 금지.
// 참고: docs/PLAN.md E절, kis-token.service.ts(토큰 제공).
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import type { CandleInterval, Candle, Market, Quote } from '@tickr/shared';
import type { Env } from '../config/env.validation';
import { KisRateLimiter } from './kis-rate-limiter';
import { KisTokenService } from './kis-token.service';
import {
  toDailyCandles,
  toMinuteCandles,
  toOverseasDailyCandles,
  toOverseasMinuteCandles,
  toOverseasQuote,
  toQuote,
} from './kis-rest.mapper';

/** 시장 라우팅 정보 — QuoteService가 symbols 테이블에서 조회해 전달. */
export interface KisMarketMeta {
  market: Market; // 'KR' | 'US'
  exchange: string | null; // US: 'NASDAQ' | 'NYSE' | ...
}

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

const OVERSEAS_PATH = {
  quote: '/uapi/overseas-price/v1/quotations/price',
  daily: '/uapi/overseas-price/v1/quotations/dailyprice',
  minute: '/uapi/overseas-price/v1/quotations/inquire-time-itemchartprice',
} as const;

const OVERSEAS_TR = {
  quote: 'HHDFS00000300',
  daily: 'HHDFS76240000',
  minute: 'HHDFS76950200',
} as const;

const MARKET_DIV = 'J'; // 국내주식

// 거래소명 → KIS 해외거래소 코드(EXCD).
const EXCD: Record<string, string> = {
  NASDAQ: 'NAS',
  NYSE: 'NYS',
  AMEX: 'AMS',
};
const toExcd = (exchange: string | null): string =>
  (exchange && EXCD[exchange]) ?? 'NAS';

const REQUEST_TIMEOUT_MS = 10_000;

@Injectable()
export class KisRestService {
  private readonly logger = new Logger(KisRestService.name);

  constructor(
    private readonly token: KisTokenService,
    private readonly config: ConfigService<Env, true>,
    private readonly rateLimiter: KisRateLimiter,
  ) {}

  /** 현재가 단건 조회 → Quote. 시장(KR/US)에 따라 국내/해외 API 분기. */
  async getQuote(symbol: string, meta: KisMarketMeta): Promise<Quote> {
    if (meta.market === 'US')
      return this.getOverseasQuote(symbol, meta.exchange);

    const data = await this.get(PATH.quote, TR_ID.quote, {
      FID_COND_MRKT_DIV_CODE: MARKET_DIV,
      FID_INPUT_ISCD: symbol,
    });
    return toQuote(symbol, data);
  }

  /** 캔들 조회 → Candle[](오름차순). 시장(KR/US) + interval(일/분봉) 분기. */
  async getCandles(
    symbol: string,
    interval: CandleInterval,
    limit: number,
    meta: KisMarketMeta,
  ): Promise<Candle[]> {
    if (meta.market === 'US') {
      return interval === '1d'
        ? this.getOverseasDailyCandles(symbol, meta.exchange, limit)
        : this.getOverseasMinuteCandles(symbol, meta.exchange, limit);
    }
    return interval === '1d'
      ? this.getDailyCandles(symbol, limit)
      : this.getMinuteCandles(symbol, limit);
  }

  // -------------------------------------------------------------------------
  // private — 해외(US)
  // -------------------------------------------------------------------------

  private async getOverseasQuote(
    symbol: string,
    exchange: string | null,
  ): Promise<Quote> {
    const data = await this.get(OVERSEAS_PATH.quote, OVERSEAS_TR.quote, {
      AUTH: '',
      EXCD: toExcd(exchange),
      SYMB: symbol,
    });
    return toOverseasQuote(symbol, data);
  }

  private async getOverseasDailyCandles(
    symbol: string,
    exchange: string | null,
    limit: number,
  ): Promise<Candle[]> {
    const data = await this.get(OVERSEAS_PATH.daily, OVERSEAS_TR.daily, {
      AUTH: '',
      EXCD: toExcd(exchange),
      SYMB: symbol,
      GUBN: '0', // 0=일, 1=주, 2=월
      BYMD: '', // 기준일(공백=최근)
      MODP: '1', // 수정주가 반영
    });
    return toOverseasDailyCandles(data, limit);
  }

  private async getOverseasMinuteCandles(
    symbol: string,
    exchange: string | null,
    limit: number,
  ): Promise<Candle[]> {
    const data = await this.get(OVERSEAS_PATH.minute, OVERSEAS_TR.minute, {
      AUTH: '',
      EXCD: toExcd(exchange),
      SYMB: symbol,
      NMIN: '1', // 1분봉
      PINC: '1', // 전일 포함
      NEXT: '',
      NREC: String(Math.min(limit, 120)), // 최대 120건
      FILL: '',
      KEYB: '',
    });
    return toOverseasMinuteCandles(data, limit);
  }

  // -------------------------------------------------------------------------
  // private — 국내(KR)
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

  /**
   * KIS GET 공통. rate-limiter로 호출 간격을 이격하고,
   * 그래도 한도 충돌(EGW00201)이 나면 1회 재시도(재시도도 다음 슬롯 경유 → 자가복구).
   */
  private async get(
    path: string,
    trId: string,
    params: Record<string, string>,
  ): Promise<unknown> {
    try {
      return await this.requestOnce(path, trId, params);
    } catch (err) {
      if (this.isRateLimited(err)) {
        this.logger.warn(`KIS rate-limited(EGW00201) — retry once: ${path}`);
        return this.requestOnce(path, trId, params);
      }
      throw err;
    }
  }

  /** 단일 KIS GET — 토큰/헤더 구성 + rate-limiter 슬롯 경유 axios 호출. */
  private async requestOnce(
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
    const res = await this.rateLimiter.run(() =>
      axios.get<unknown>(`${this.token.getBaseUrl()}${path}`, {
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
      }),
    );
    return res.data;
  }

  /** KIS 초당 거래건수 초과(EGW00201) 여부 — HTTP 500 + msg_cd로 판별. */
  private isRateLimited(err: unknown): boolean {
    if (err instanceof AxiosError) {
      const data = err.response?.data as { msg_cd?: string } | undefined;
      return data?.msg_cd === 'EGW00201';
    }
    return false;
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

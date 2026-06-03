// kis-rest.mapper 단위 테스트 — 순수 함수(네트워크/모킹 없음).
// 검증 초점: 단위 변환(문자열→number, ratio %→소수), 정렬(최신순→오름차순),
// time epoch(s) 환산(일봉 UTC 자정 / 분봉 KST→UTC), rt_cd 실패 throw, limit 슬라이스.
import { toQuote, toDailyCandles, toMinuteCandles } from './kis-rest.mapper';

describe('toQuote', () => {
  const base = {
    rt_cd: '0',
    output: {
      stck_prpr: '72400',
      stck_sdpr: '71200', // 기준가(=전일 종가) — 라이브 KIS 필드명
      acml_vol: '12345678',
    },
  };

  it('문자열 수치를 number로 매핑하고 delta/ratio를 직접 계산한다', () => {
    const { ts, ...rest } = toQuote('005930', base);
    expect(rest).toEqual({
      symbol: '005930',
      price: 72400,
      prevClose: 71200,
      delta: 1200,
      ratio: 1200 / 71200,
      volume: 12345678,
    });
    expect(typeof ts).toBe('number');
  });

  it('하락 시 delta/ratio가 음수다', () => {
    const q = toQuote('005930', {
      rt_cd: '0',
      output: { stck_prpr: '70000', stck_sdpr: '71200', acml_vol: '0' },
    });
    expect(q.delta).toBe(-1200);
    expect(q.ratio).toBeLessThan(0);
    expect(q.volume).toBe(0);
  });

  it('ts는 epoch ms(현재 시각 근처)다', () => {
    const before = Date.now();
    const q = toQuote('005930', base);
    expect(q.ts).toBeGreaterThanOrEqual(before);
    expect(q.ts).toBeLessThanOrEqual(Date.now());
  });

  it('rt_cd !== "0"이면 throw', () => {
    expect(() => toQuote('005930', { rt_cd: '1', msg1: 'fail' })).toThrow(
      /rt_cd=1/,
    );
  });

  it('shape drift(output 누락)면 throw', () => {
    expect(() => toQuote('005930', { rt_cd: '0' })).toThrow();
  });
});

describe('toDailyCandles', () => {
  // KIS는 최신→과거 순으로 반환.
  const response = {
    rt_cd: '0',
    output2: [
      {
        stck_bsop_date: '20260603',
        stck_oprc: '71000',
        stck_hgpr: '72500',
        stck_lwpr: '70800',
        stck_clpr: '72400',
        acml_vol: '12345678',
      },
      {
        stck_bsop_date: '20260602',
        stck_oprc: '70000',
        stck_hgpr: '71200',
        stck_lwpr: '69900',
        stck_clpr: '71200',
        acml_vol: '9876543',
      },
      // 빈 패딩 row — 스킵돼야 함
      {
        stck_bsop_date: '',
        stck_oprc: '0',
        stck_hgpr: '0',
        stck_lwpr: '0',
        stck_clpr: '0',
        acml_vol: '0',
      },
    ],
  };

  it('오름차순 정렬 + UTC 자정 epoch s로 매핑하고 빈 row를 스킵한다', () => {
    const candles = toDailyCandles(response, 120);
    expect(candles).toHaveLength(2);
    expect(candles[0].time).toBeLessThan(candles[1].time);
    // 20260602 UTC 자정 = Date.UTC(2026,5,2)/1000
    expect(candles[0].time).toBe(Math.trunc(Date.UTC(2026, 5, 2) / 1000));
    expect(candles[1]).toEqual({
      time: Math.trunc(Date.UTC(2026, 5, 3) / 1000),
      open: 71000,
      high: 72500,
      low: 70800,
      close: 72400,
      volume: 12345678,
    });
  });

  it('limit이 데이터보다 작으면 최신 limit건만 반환한다', () => {
    const candles = toDailyCandles(response, 1);
    expect(candles).toHaveLength(1);
    expect(candles[0].time).toBe(Math.trunc(Date.UTC(2026, 5, 3) / 1000)); // 최신
  });

  it('rt_cd 실패 시 throw', () => {
    expect(() => toDailyCandles({ rt_cd: '7', output2: [] }, 120)).toThrow();
  });
});

describe('toMinuteCandles', () => {
  const response = {
    rt_cd: '0',
    output2: [
      {
        stck_bsop_date: '20260603',
        stck_cntg_hour: '093000',
        stck_oprc: '72000',
        stck_hgpr: '72300',
        stck_lwpr: '71900',
        stck_prpr: '72100',
        cntg_vol: '1000',
      },
      {
        stck_bsop_date: '20260603',
        stck_cntg_hour: '092900',
        stck_oprc: '71900',
        stck_hgpr: '72100',
        stck_lwpr: '71800',
        stck_prpr: '72000',
        cntg_vol: '900',
      },
    ],
  };

  it('close=stck_prpr, volume=cntg_vol로 매핑하고 KST→UTC로 환산한다', () => {
    const candles = toMinuteCandles(response, 120);
    expect(candles).toHaveLength(2);
    expect(candles[0].time).toBeLessThan(candles[1].time);
    // 09:29 KST = 00:29 UTC
    expect(candles[0].time).toBe(
      Math.trunc(Date.UTC(2026, 5, 3, 9, 29, 0) / 1000) - 9 * 3600,
    );
    expect(candles[1].close).toBe(72100);
    expect(candles[1].volume).toBe(1000);
  });
});

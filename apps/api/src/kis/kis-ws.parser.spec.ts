// kis-ws.parser 단위 테스트 — 순수 함수(네트워크/모킹 없음).
// 검증 초점: 프레임 분류(data/system/pingpong), 국내/해외 인덱스 파싱, 다건 stride,
// 비정상 price 제외, 미지 tr_id 무시, 깨진 프레임 throw 안 함.
import { parseKisFrame, parseTicks, type KisFrame } from './kis-ws.parser';

describe('parseKisFrame', () => {
  it('국내 데이터 프레임을 data로 분류하고 trId/count를 추출한다', () => {
    const frame = parseKisFrame('0|H0STCNT0|001|005930^123929^57700^5');
    expect(frame.kind).toBe('data');
    if (frame.kind !== 'data') throw new Error('expected data');
    expect(frame.trId).toBe('H0STCNT0');
    expect(frame.count).toBe(1);
    expect(frame.payload).toBe('005930^123929^57700^5');
  });

  it('PINGPONG JSON 프레임을 pingpong으로 분류한다', () => {
    const raw = '{"header":{"tr_id":"PINGPONG","datetime":"20260101120000"}}';
    const frame = parseKisFrame(raw);
    expect(frame.kind).toBe('pingpong');
    if (frame.kind === 'pingpong') expect(frame.raw).toBe(raw);
  });

  it('구독 ACK JSON 프레임을 system으로 분류한다', () => {
    const raw =
      '{"header":{"tr_id":"H0STCNT0","tr_key":"005930"},"body":{"rt_cd":"0","msg1":"SUBSCRIBE SUCCESS"}}';
    const frame = parseKisFrame(raw);
    expect(frame.kind).toBe('system');
    if (frame.kind === 'system') expect(frame.trId).toBe('H0STCNT0');
  });

  it('암호화 프레임(플래그=1)은 system으로 흘린다', () => {
    const frame = parseKisFrame('1|H0STCNI0|001|encrypted-body');
    expect(frame.kind).toBe('system');
  });

  it('깨진/빈 프레임도 throw 없이 분류한다', () => {
    expect(() => parseKisFrame('')).not.toThrow();
    expect(() => parseKisFrame('{not json')).not.toThrow();
    expect(parseKisFrame('{not json').kind).toBe('system');
  });
});

describe('parseTicks', () => {
  const dataFrame = (
    trId: string,
    count: number,
    payload: string,
  ): Extract<KisFrame, { kind: 'data' }> => ({
    kind: 'data',
    trId,
    count,
    payload,
  });

  it('국내(H0STCNT0) 단건 → symbol[0]/price[2] 추출', () => {
    const ticks = parseTicks(dataFrame('H0STCNT0', 1, '005930^123929^57700^5'));
    expect(ticks).toHaveLength(1);
    expect(ticks[0]).toMatchObject({ symbol: '005930', price: 57700 });
    expect(typeof ticks[0].ts).toBe('number');
  });

  it('국내 다건(count=2) → stride로 레코드 분할', () => {
    const ticks = parseTicks(
      dataFrame('H0STCNT0', 2, '005930^090000^72400^1^000660^090000^128000^1'),
    );
    expect(ticks).toHaveLength(2);
    expect(ticks[0]).toMatchObject({ symbol: '005930', price: 72400 });
    expect(ticks[1]).toMatchObject({ symbol: '000660', price: 128000 });
  });

  it('해외(HDFSCNT0) → symbol[1]/price[11] 추출', () => {
    const payload = 'DNASAAPL^AAPL^4^t^t^t^t^t^t^t^t^185.20';
    const ticks = parseTicks(dataFrame('HDFSCNT0', 1, payload));
    expect(ticks).toHaveLength(1);
    expect(ticks[0]).toMatchObject({ symbol: 'AAPL', price: 185.2 });
  });

  it('미지 tr_id는 빈 배열', () => {
    expect(parseTicks(dataFrame('UNKNOWN0', 1, 'a^b^c'))).toEqual([]);
  });

  it('비정상 price(0/음수/NaN)는 제외', () => {
    expect(parseTicks(dataFrame('H0STCNT0', 1, '005930^t^0'))).toEqual([]);
    expect(parseTicks(dataFrame('H0STCNT0', 1, '005930^t^-5'))).toEqual([]);
    expect(parseTicks(dataFrame('H0STCNT0', 1, '005930^t^abc'))).toEqual([]);
  });

  it('파서 진입은 parseKisFrame → parseTicks 합성으로 동작한다', () => {
    const frame = parseKisFrame('0|H0STCNT0|001|005930^123929^57700^5');
    if (frame.kind !== 'data') throw new Error('expected data');
    expect(parseTicks(frame)[0]).toMatchObject({ price: 57700 });
  });
});

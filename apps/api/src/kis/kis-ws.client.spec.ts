// KisWsClient 동작 테스트 — `ws`를 모킹(실제 KIS 연결 없음).
// 검증: 멱등 subscribe, 재연결 시 전량 재구독, 지수 백오프, PINGPONG echo,
// tick emit, unsubscribe no-op, onModuleDestroy 후 재연결 중단.
import type { EventEmitter } from 'node:events';
import { Logger } from '@nestjs/common';
import { WebSocket } from 'ws';
import { KisWsClient } from './kis-ws.client';
import type { KisTokenService } from './kis-token.service';

// 테스트 출력 정리 — KisWsClient 로그 억제(동작 검증과 무관).
// afterEach의 restoreAllMocks가 spy를 되돌리므로 beforeEach에서 재설정.
const silenceLogger = (): void => {
  for (const level of ['log', 'warn', 'debug', 'error'] as const) {
    jest.spyOn(Logger.prototype, level).mockImplementation(() => undefined);
  }
};

// ── ws 모킹 ──────────────────────────────────────────────────────────────────
// jest.mock은 호이스팅되므로 mock 클래스를 팩토리 내부에 정의(TDZ 회피).
jest.mock('ws', () => {
  const { EventEmitter: EE } =
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('node:events') as typeof import('node:events');
  class MockWebSocket extends EE {
    static readonly OPEN = 1;
    static instances: MockWebSocket[] = [];
    readyState = 0;
    readonly url: string;
    send = jest.fn();
    close = jest.fn(() => {
      this.readyState = 3;
      this.emit('close');
    });
    constructor(url: string) {
      super();
      this.url = url;
      MockWebSocket.instances.push(this);
    }
    /** 서버측 open 시뮬레이션 — readyState OPEN 후 'open' emit. */
    fireOpen(): void {
      this.readyState = MockWebSocket.OPEN;
      this.emit('open');
    }
  }
  return { WebSocket: MockWebSocket };
});

// 모킹된 WebSocket을 테스트가 다루기 위한 타입 핸들.
interface MockSocket extends EventEmitter {
  readyState: number;
  url: string;
  send: jest.Mock;
  close: jest.Mock;
  fireOpen(): void;
}
const MockWs = WebSocket as unknown as {
  OPEN: number;
  instances: MockSocket[];
};

const flush = async (): Promise<void> => {
  // handleOpen이 getApprovalKey()를 await — microtask 몇 틱 비움.
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

const lastSocket = (): MockSocket => {
  const list = MockWs.instances;
  return list[list.length - 1];
};

// KIS 구독 메시지 형태 — send 인자 검증용 타입.
interface SubMessage {
  header: { approval_key: string; tr_type: string };
  body: { input: { tr_id: string; tr_key: string } };
}
const sentAt = (sock: MockSocket, idx = 0): SubMessage => {
  const call = sock.send.mock.calls[idx] as unknown[] | undefined;
  return JSON.parse(String(call?.[0])) as SubMessage;
};

const KR = (symbol: string) => ({ symbol, market: 'KR' as const });

describe('KisWsClient', () => {
  let client: KisWsClient;
  let token: jest.Mocked<
    Pick<KisTokenService, 'getEnv' | 'getApprovalKey' | 'invalidateApprovalKey'>
  >;

  beforeEach(() => {
    MockWs.instances.length = 0;
    silenceLogger();
    jest.useFakeTimers();
    token = {
      getEnv: jest.fn().mockReturnValue('mock'),
      getApprovalKey: jest.fn().mockResolvedValue('approval-xyz'),
      invalidateApprovalKey: jest.fn(),
    };
    client = new KisWsClient(token as unknown as KisTokenService);
  });

  afterEach(() => {
    client.onModuleDestroy();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('onModuleInit이 단일 소켓을 mock env WS URL로 연다', () => {
    client.onModuleInit();
    expect(MockWs.instances).toHaveLength(1);
    expect(lastSocket().url).toContain('31000'); // mock 포트
  });

  it('open 후 활성 심볼을 등록 메시지로 송신한다', async () => {
    client.onModuleInit();
    client.subscribe([KR('005930')]);
    lastSocket().fireOpen();
    await flush();

    expect(client.state).toBe('open');
    expect(lastSocket().send).toHaveBeenCalledTimes(1);
    const msg = sentAt(lastSocket());
    expect(msg.header.approval_key).toBe('approval-xyz');
    expect(msg.header.tr_type).toBe('1'); // register
    expect(msg.body.input.tr_key).toBe('005930');
  });

  it('중복 subscribe는 등록 메시지를 1회만 보낸다 (멱등)', async () => {
    client.onModuleInit();
    lastSocket().fireOpen();
    await flush();
    client.subscribe([KR('005930')]);
    client.subscribe([KR('005930')]);
    expect(client.activeCount).toBe(1);
    expect(lastSocket().send).toHaveBeenCalledTimes(1);
  });

  it('unsubscribe는 해지 메시지를 보내고 미구독 심볼은 no-op', async () => {
    client.onModuleInit();
    lastSocket().fireOpen();
    await flush();
    client.subscribe([KR('005930')]);
    lastSocket().send.mockClear();

    client.unsubscribe(['000660']); // 미구독 → no-op
    expect(lastSocket().send).not.toHaveBeenCalled();

    client.unsubscribe(['005930']);
    expect(client.activeCount).toBe(0);
    const msg = sentAt(lastSocket());
    expect(msg.header.tr_type).toBe('2'); // unregister
  });

  it('재연결 시 활성 심볼을 전량 재구독한다', async () => {
    client.onModuleInit();
    client.subscribe([KR('005930'), KR('000660')]);
    lastSocket().fireOpen();
    await flush();
    expect(lastSocket().send).toHaveBeenCalledTimes(2);

    // KIS가 연결을 끊음
    lastSocket().emit('close');
    expect(client.state).toBe('reconnecting');

    // 백오프 타이머 발화 → 재연결
    await jest.advanceTimersByTimeAsync(2_000);
    expect(MockWs.instances).toHaveLength(2);

    lastSocket().fireOpen();
    await flush();

    const sock = lastSocket();
    expect(sock.send).toHaveBeenCalledTimes(2);
    const keys = [sentAt(sock, 0), sentAt(sock, 1)].map(
      (m) => m.body.input.tr_key,
    );
    expect(new Set(keys)).toEqual(new Set(['005930', '000660'])); // 둘 다 재구독
    expect(sentAt(sock, 0).header.tr_type).toBe('1'); // register
  });

  it('재연결 백오프가 지수적으로 증가한다 (1s → 2s)', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.5); // jitter 0
    client.onModuleInit();
    lastSocket().fireOpen();
    await flush();

    lastSocket().emit('close'); // attempt 0 → delay 1000
    await jest.advanceTimersByTimeAsync(999);
    expect(MockWs.instances).toHaveLength(1); // 아직 재연결 안 됨
    await jest.advanceTimersByTimeAsync(1);
    expect(MockWs.instances).toHaveLength(2); // 1000ms에 재연결

    lastSocket().emit('close'); // attempt 1 → delay 2000
    await jest.advanceTimersByTimeAsync(1999);
    expect(MockWs.instances).toHaveLength(2);
    await jest.advanceTimersByTimeAsync(1);
    expect(MockWs.instances).toHaveLength(3);
  });

  it('PINGPONG 프레임을 그대로 echo한다', async () => {
    client.onModuleInit();
    lastSocket().fireOpen();
    await flush();
    lastSocket().send.mockClear();

    const ping = '{"header":{"tr_id":"PINGPONG","datetime":"20260101120000"}}';
    lastSocket().emit('message', Buffer.from(ping));
    expect(lastSocket().send).toHaveBeenCalledWith(ping);
  });

  it('데이터 프레임 수신 시 tick을 emit한다', async () => {
    client.onModuleInit();
    lastSocket().fireOpen();
    await flush();

    const onTick = jest.fn();
    client.on('tick', onTick);
    lastSocket().emit(
      'message',
      Buffer.from('0|H0STCNT0|001|005930^123929^57700^5'),
    );

    expect(onTick).toHaveBeenCalledTimes(1);
    expect(onTick).toHaveBeenCalledWith(
      expect.objectContaining({ symbol: '005930', price: 57700 }),
    );
  });

  it('재연결 대기 중 onModuleDestroy 시 타이머가 정리돼 재연결하지 않는다', async () => {
    client.onModuleInit();
    lastSocket().fireOpen();
    await flush();

    lastSocket().emit('close'); // reconnecting — 백오프 타이머 pending
    expect(client.state).toBe('reconnecting');

    client.onModuleDestroy();
    expect(client.state).toBe('idle');
    await jest.advanceTimersByTimeAsync(60_000);
    expect(MockWs.instances).toHaveLength(1); // 좀비 재연결 없음
  });

  it('연속 재연결 실패가 임계(3)에 도달하면 approval_key를 무효화한다', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.5); // jitter 0 → 결정적 delay
    client.onModuleInit();

    lastSocket().emit('close'); // attempt 0 → delay 1000
    await jest.advanceTimersByTimeAsync(1_000);
    lastSocket().emit('close'); // attempt 1 → delay 2000
    await jest.advanceTimersByTimeAsync(2_000);
    lastSocket().emit('close'); // attempt 2 → delay 4000
    expect(token.invalidateApprovalKey).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(4_000);
    lastSocket().emit('close'); // attempt 3 → 3 % 3 === 0 → 무효화
    expect(token.invalidateApprovalKey).toHaveBeenCalledTimes(1);
  });
});

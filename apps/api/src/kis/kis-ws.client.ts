// KisWsClient — KIS 실시간 시세 WS 단일 연결(운영자 키 1개로 fan-out).
//
// 책임: 단일 WS 연결 lifecycle(인증·재연결·재구독·tick emit) + 명령형 구독 API.
//  - subscribe/unsubscribe: 상위 WsHub(별도 이슈)가 호출. 멱등·동기·연결 상태 무관 안전.
//  - on('tick'): 파싱된 KisWsRawTick emit → Hub broadcast / LimitMatcher 소비.
//  - 41 동시구독 cap·LRU 정책은 구독자 정보를 가진 Hub 책임 — 여기선 activeCount getter만.
//
// KIS WS 인증은 REST access_token이 아니라 approval_key(KisTokenService.getApprovalKey).
// 비밀(approval_key) 로깅 금지. 참고: docs/PLAN.md G절, .claude/rules/monorepo-boundary.md.
import { EventEmitter } from 'node:events';
import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { WebSocket, type RawData } from 'ws';
import { KisTokenService } from './kis-token.service';
import { KIS_WS_URL } from './kis-token.types';
import { parseKisFrame, parseTicks } from './kis-ws.parser';
import {
  KIS_WS_TR_TYPE,
  nextBackoffMs,
  toWsTrId,
  toWsTrKey,
  type KisWsClientEvents,
  type KisWsConnState,
  type KisWsSubscription,
} from './kis-ws.types';

// 연속 재연결 실패가 이 횟수에 도달하면 approval_key 무효화 후 재발급(stale 키 방어).
const APPROVAL_RETRY_THRESHOLD = 3;

@Injectable()
export class KisWsClient
  extends EventEmitter
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(KisWsClient.name);

  private socket: WebSocket | null = null;
  private connState: KisWsConnState = 'idle';
  // 활성 구독 — symbol을 키로 메타 보존(재연결 시 전량 재구독의 source of truth).
  private readonly activeMap = new Map<string, KisWsSubscription>();
  private reconnectAttempt = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private connecting = false;
  private destroyed = false;
  private approvalKey: string | null = null;
  private wsUrl!: string;

  constructor(private readonly token: KisTokenService) {
    super();
  }

  // ── lifecycle ────────────────────────────────────────────────────────────
  onModuleInit(): void {
    this.wsUrl = KIS_WS_URL[this.token.getEnv()];
    this.logger.log(`init env=${this.token.getEnv()} wsUrl=${this.wsUrl}`);
    // WS는 끊겨도 REST가 동작 — 연결 실패는 throw 대신 백오프 재시도(부팅 차단 방지).
    this.connect();
  }

  onModuleDestroy(): void {
    this.destroyed = true;
    this.disconnect();
  }

  // ── public API (WsHub가 소비) ──────────────────────────────────────────────

  /** 구독 등록(멱등). 새 심볼만 KIS에 등록 메시지 송신, 연결 전이면 open 시 flush. */
  subscribe(subs: KisWsSubscription[]): void {
    for (const sub of subs) {
      if (this.activeMap.has(sub.symbol)) continue;
      this.activeMap.set(sub.symbol, sub);
      if (this.isOpen()) this.sendSubscription(sub, 'register');
    }
  }

  /** 구독 해지(멱등). 미구독 심볼은 no-op. */
  unsubscribe(symbols: string[]): void {
    for (const symbol of symbols) {
      const sub = this.activeMap.get(symbol);
      if (!sub) continue;
      this.activeMap.delete(symbol);
      if (this.isOpen()) this.sendSubscription(sub, 'unregister');
    }
  }

  /** 현재 활성 구독 심볼(Hub의 41 cap 판단 입력). */
  get activeSymbols(): readonly string[] {
    return [...this.activeMap.keys()];
  }

  get activeCount(): number {
    return this.activeMap.size;
  }

  /** 연결 상태(헬스/디버깅). */
  get state(): KisWsConnState {
    return this.connState;
  }

  // ── 연결 관리 ──────────────────────────────────────────────────────────────

  /** 연결 시작(멱등). inflight/open/destroyed면 no-op — 소켓 1개 보장. */
  connect(): void {
    if (this.destroyed || this.connecting || this.isOpen()) return;
    this.connecting = true;
    this.setState(this.reconnectAttempt > 0 ? 'reconnecting' : 'connecting');

    const socket = new WebSocket(this.wsUrl);
    this.socket = socket;
    socket.on('open', () => void this.handleOpen());
    socket.on('message', (data: RawData) => this.handleMessage(data));
    socket.on('close', () => this.handleClose());
    socket.on('error', (err: Error) => this.handleError(err));
  }

  /** 연결 종료 + 타이머/소켓 정리. */
  disconnect(): void {
    this.clearReconnectTimer();
    this.connecting = false;
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.close();
      this.socket = null;
    }
    this.setState('idle');
  }

  // ── 소켓 이벤트 핸들러 ──────────────────────────────────────────────────────

  private async handleOpen(): Promise<void> {
    // await 동안의 경합 판별을 위해 진입 시점 소켓을 캡처. connecting은
    // approval 확보(+소켓 동일성 확인) 후에 내림 — 그 전엔 connect() 재진입 차단.
    const socket = this.socket;
    let approvalKey: string;
    try {
      approvalKey = await this.token.getApprovalKey();
    } catch (err) {
      // approval_key 발급 실패 → 연결 무의미. 소켓 닫아 close → 재연결 흐름 진입.
      this.logger.error(`approval_key unavailable on open: ${describe(err)}`);
      socket?.close();
      return;
    }
    // await 사이 close→재연결로 소켓이 교체됐거나 destroy됐으면 중단(중복 소켓 방지).
    if (this.destroyed || this.socket !== socket) return;

    this.connecting = false;
    this.approvalKey = approvalKey;
    this.reconnectAttempt = 0;
    this.setState('open');
    // 재연결 포함 — 활성 심볼 전량 재구독.
    for (const sub of this.activeMap.values()) {
      this.sendSubscription(sub, 'register');
    }
    this.logger.log(`open: resubscribed ${this.activeMap.size} symbol(s)`);
  }

  private handleMessage(data: RawData): void {
    const raw = rawToString(data);
    const frame = parseKisFrame(raw);

    switch (frame.kind) {
      case 'pingpong':
        // KIS heartbeat — 받은 프레임 그대로 echo.
        this.socket?.send(frame.raw);
        return;
      case 'system':
        this.logger.debug(`system frame: tr_id=${frame.trId ?? 'n/a'}`);
        return;
      case 'data': {
        const ticks = parseTicks(frame);
        for (const tick of ticks) {
          try {
            this.emit('tick', tick);
          } catch (err) {
            // listener 예외가 소켓 루프를 죽이지 않도록 가드.
            this.logger.warn(`tick listener threw: ${describe(err)}`);
          }
        }
        return;
      }
    }
  }

  private handleError(err: Error): void {
    // 'error'는 보통 'close'를 동반 — 재연결은 handleClose에서만 스케줄(중복 방지).
    this.logger.warn(`socket error: ${err.message}`);
  }

  private handleClose(): void {
    this.connecting = false;
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket = null;
    }
    if (this.destroyed) return;
    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    this.clearReconnectTimer();
    // 연속 실패가 임계에 도달하면 approval_key를 무효화 — 다음 open이 재발급.
    if (
      this.reconnectAttempt > 0 &&
      this.reconnectAttempt % APPROVAL_RETRY_THRESHOLD === 0
    ) {
      this.token.invalidateApprovalKey();
      this.approvalKey = null;
    }
    const delay = nextBackoffMs(this.reconnectAttempt);
    this.reconnectAttempt += 1;
    this.setState('reconnecting');
    this.logger.warn(
      `reconnect scheduled in ${delay}ms (attempt ${this.reconnectAttempt})`,
    );
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  // ── 송신/유틸 ──────────────────────────────────────────────────────────────

  /** KIS 구독 등록/해지 메시지 송신. 연결 OPEN + approval_key 보유 시에만. */
  private sendSubscription(
    sub: KisWsSubscription,
    action: 'register' | 'unregister',
  ): void {
    if (!this.isOpen() || !this.approvalKey) return;
    const message = {
      header: {
        approval_key: this.approvalKey,
        custtype: 'P',
        tr_type: KIS_WS_TR_TYPE[action],
        'content-type': 'utf-8',
      },
      body: {
        input: { tr_id: toWsTrId(sub.market), tr_key: toWsTrKey(sub) },
      },
    };
    this.socket?.send(JSON.stringify(message));
  }

  private isOpen(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private setState(next: KisWsConnState): void {
    if (this.connState === next) return;
    this.connState = next;
    this.emit('state', next);
  }

  // ── typed EventEmitter ─────────────────────────────────────────────────────
  override on<E extends keyof KisWsClientEvents>(
    event: E,
    listener: KisWsClientEvents[E],
  ): this {
    return super.on(event, listener);
  }

  override emit<E extends keyof KisWsClientEvents>(
    event: E,
    ...args: Parameters<KisWsClientEvents[E]>
  ): boolean {
    return super.emit(event, ...args);
  }
}

function describe(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** ws RawData(Buffer | ArrayBuffer | Buffer[]) → utf-8 문자열 정규화. */
function rawToString(data: RawData): string {
  if (Array.isArray(data)) return Buffer.concat(data).toString('utf8');
  if (data instanceof ArrayBuffer) return Buffer.from(data).toString('utf8');
  return data.toString('utf8');
}

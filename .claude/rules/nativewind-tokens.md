# Rule: NativeWind 디자인 토큰 (모바일 UI)

모바일 UI는 **NativeWind v4 토큰**만 사용한다. hex 색상, 숫자 패딩/마진을 하드코딩하지 않는다.

## 토큰 정의 위치

- 토큰: `apps/mobile/tailwind.config.js` (단일 출처)
- 사용: `className="bg-bg text-text border-border"` 등

코드에서 `style={{ color: '#FF3B30' }}` 같은 인라인 hex 사용 금지. 항상 token class.

## 색상 토큰

### 시장 컬러 (KR 표준 — 절대 반전 금지)
| 토큰 | 다크 | 라이트 | 용도 |
|---|---|---|---|
| `up` | `#FF3B30` | `#E5342B` | 상승가, 매수 버튼 |
| `down` | `#0A84FF` | `#1769DC` | 하락가, 매도 버튼 |
| `flat` | `#8E8E93` | `#6B6B70` | 변동 없음 |

### 표면/텍스트
| 토큰 | 다크 | 라이트 | 용도 |
|---|---|---|---|
| `bg` | `#000000` | `#FFFFFF` | 화면 배경 |
| `surface` | `#1C1C1E` | `#F2F2F7` | 카드/시트 배경 |
| `surface-2` | `#2C2C2E` | `#E5E5EA` | 분할/입력 배경 |
| `border` | `#38383A` | `#D1D1D6` | 보더 |
| `text` | `#FFFFFF` | `#000000` | 본문 |
| `text-muted` | `#8E8E93` | `#6B6B70` | 보조 텍스트 |
| `text-disabled` | `#48484A` | `#C7C7CC` | 비활성 |

### 액션
| 토큰 | 값 | 용도 |
|---|---|---|
| `primary` | `#0A84FF` | 일반 액션 (검색, 확인) |
| `danger` | `#FF453A` | 삭제, 위험 |

매수/매도 버튼은 **`primary`가 아닌 `up`/`down`**.

## 스페이싱

Tailwind 기본(`p-2`=8px, `p-4`=16px) 사용. 별칭:
- 화면 가장자리: `px-4` (또는 `screen-px` 별칭)
- 카드 패딩: `p-4` (또는 `card-p`)
- 섹션 간격: `gap-6`
- 행 간격: `gap-2`

## 타이포

| 토큰 | 크기/굵기 | 용도 |
|---|---|---|
| `title-lg` | 28 / bold | 화면 타이틀 |
| `title` | 20 / semibold | 섹션 타이틀, 종목명 |
| `body` | 16 / regular | 본문 |
| `caption` | 13 / regular | 보조 |
| `price-lg` | 32 / semibold + **tabular-nums** | 종목 상세 현재가 |
| `price` | 16 / medium + **tabular-nums** | 가격, 등락 |
| `mono-sm` | 12 / monospace | 종목코드 |

가격/등락 텍스트는 **반드시 `tabular-nums`** (자릿수 변동 시 흔들림 방지).

## 라운드

- `rounded-xl` (12px) — 카드/시트
- `rounded-lg` (8px) — 칩/뱃지
- 그림자 사용 X — 구분은 `border-border` 1px로.

## 검사 (CI/리뷰)

```bash
grep -rn "#[0-9A-Fa-f]\{3,6\}" apps/mobile/src/{entities,features,widgets,pages}
```
1건이라도 발견되면 토큰화 필요.

## 이유

- 토큰만 사용해야 다크/라이트 모드 전환이 한 곳에서 끝난다.
- 시장 컬러 반전(상승=초록 등)은 KR 사용자 인지와 정면 충돌.
- tabular-nums는 가격 리스트의 가독성/안정성에 결정적.

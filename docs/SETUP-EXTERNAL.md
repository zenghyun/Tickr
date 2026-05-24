# 외부 서비스 셋업 가이드

W2 이후 개발을 위해 사용자가 직접 발급/가입해야 하는 외부 키 / 계정 체크리스트.
브라우저로 직접 진행해야 하므로 코드와 분리된 작업입니다.

각 항목에서 받은 값은 프로젝트 루트의 `.env` 에 채워 넣으면 됩니다. (`.env.example` 참고)

---

## 1. 한국투자증권 KIS Developers — 시세/매매 API

**왜 필요한가:** 종목 검색, 현재가, 일/분봉 차트, 실시간 시세 WebSocket 모두 여기서 제공. **MVP 단계에서는 모의투자(VTS) 서버만 사용**.

### 사전 조건
- 한국투자증권 일반 계좌 1개 (모바일/지점 어느 쪽이든 OK)
- 한국투자증권 **모의투자 신청** → 모의계좌 발급 (가상 시드 1억 KRW 제공)
  - 한국투자증권 앱 또는 홈페이지 → "모의투자" → 가입/신청

### KIS Developers 가입 절차
1. <https://apiportal.koreainvestment.com> 접속 → 회원가입 (실명 인증, 본인의 한투 계좌번호 등록)
2. 상단 메뉴: **신청** → "한국투자 Open API" 사용 신청
3. 약관 동의 → "사용 신청" 폼 제출
4. 승인 후 (보통 1~2 영업일) **마이페이지 > 앱 관리** 에서:
   - **모의투자 (VTS)** 용 App Key / App Secret
   - **실전 투자** 용 App Key / App Secret  (MVP 단계 사용 안 함, 무시 가능)

### `.env` 에 입력할 값
```
KIS_USE_MOCK=true
KIS_APP_KEY=<모의투자 App Key>
KIS_APP_SECRET=<모의투자 App Secret>
KIS_BASE_URL=https://openapivts.koreainvestment.com:29443
```

### 참고
- 모의투자 REST 호출 한도: 1초 2회
- 실시간 시세 WebSocket 동시 구독: 최대 41건/세션
- 모의투자 토큰은 24시간 유효. 자동 캐싱 로직(`KisTokenCache`)에서 처리할 예정 (W3)

---

## 2. Supabase — 인증 + DB

**왜 필요한가:** 사용자 인증(이메일/소셜) + Postgres + Row Level Security. 무료 티어로 MVP 충분.

### 프로젝트 분리 원칙 (중요)

- **베타 전용 프로젝트 1개**를 새로 생성한다. 다른 프로젝트(개인 학습/회사용)와 **절대 공유 금지** — 베타 사용자 데이터와 더미 데이터가 섞이면 회수 불가.
- KIS 환경 매핑: **베타 = `KIS_USE_MOCK=true`(모의)와 1:1**. 실전 KIS로 전환할 때는 별도 Supabase 프로젝트(`tickr-prod` 등)를 새로 만든다.
- 권장 프로젝트명: `tickr-beta` (자유지만 매핑이 명시적이라 권장)

### 가입 절차
1. <https://supabase.com> 회원가입 (GitHub 로그인 권장)
2. **New Project** 생성:
   - Name: `tickr-beta` (권장 — 환경 매핑이 명확)
   - Database Password: 강한 비밀번호 (1Password 등에 백업, 분실 시 복구 불가)
   - Region: **Northeast Asia (Seoul)** — 한국 사용자 레이턴시
   - Pricing Plan: Free
3. 프로젝트 생성 완료까지 ~2분 대기

### 받아야 하는 값 (Settings → API)
| 필드 | 환경변수 | 노출 범위 |
|---|---|---|
| Project URL | `SUPABASE_URL` , `EXPO_PUBLIC_SUPABASE_URL` | 서버 + 클라이언트 (동일 값) |
| `anon` `public` key | `SUPABASE_ANON_KEY` , `EXPO_PUBLIC_SUPABASE_ANON_KEY` | 서버 + 클라이언트 (동일 값) |
| `service_role` `secret` key | `SUPABASE_SERVICE_ROLE_KEY` | **서버 전용 — 클라이언트 절대 금지** |
| JWT Settings → JWT Secret | `SUPABASE_JWT_SECRET` | **서버 전용** |

### `.env` 에 입력할 값
```
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_JWT_SECRET=<jwt secret>

EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

> ⚠️ **service_role 키 노출 = 사고.** `EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` 같은 키는 **절대 만들지 말 것.** 클라이언트 번들에 들어가면 RLS가 전부 무력화되어 모든 사용자 데이터/계좌가 공개된다. 실수로라도 입력했다면 즉시 Supabase 대시보드에서 키 로테이션 + git history 검사.
>
> 검증: `grep -E '^EXPO_PUBLIC_.*(SERVICE_ROLE|JWT_SECRET|APP_SECRET)' .env .env.example` 결과 0건이어야 한다.

---

## 3. Expo 계정

**왜 필요한가:** 추후 W7 에서 TestFlight / Internal Track 배포할 때 EAS Build/Submit 사용.

### 가입 + CLI 설치
1. <https://expo.dev> 회원가입 (GitHub 권장)
2. EAS CLI 설치: `pnpm dlx eas-cli --version` (또는 `npm i -g eas-cli`)
3. `eas login` 으로 로그인

> W1 ~ W6 동안은 로컬에서 `pnpm dev:mobile` 로 충분 (Expo Go 앱). 계정/EAS는 W7 직전에 준비해도 OK.

---

## 4. (선택) 배포용 추가 계정 — W7 직전에만 필요

- **Apple Developer Program** — $99/년. TestFlight 배포 필수.
- **Google Play Console** — $25 1회 등록비. Internal Track 배포 필수.
- **Railway** — <https://railway.app>. NestJS 서버 호스팅 ($5 무료 크레딧). GitHub 연동.

이 셋은 닫힌 베타 직전에만 준비해도 충분합니다. MVP 개발 자체는 로컬만으로 가능.

---

## 진행 우선순위 (개발 흐름 기준)

| 시기 | 필요한 작업 |
|---|---|
| **W1 종료 시점 (지금)** | 위 항목들을 가능한 한 빠르게 신청 시작. KIS 승인은 1~2일 걸리니 가장 먼저. |
| **W2 시작 전** | Supabase 프로젝트만 있으면 됨 (Auth 작업) |
| **W3 시작 전** | KIS App Key/Secret 발급 완료 필요 |
| **W7 시작 전** | Expo 계정 + Apple/Google 계정 + Railway 계정 |

`.env` 파일은 `.env.example` 을 복사해서 만들고, 위 가이드에 따라 빈칸을 채우면 됩니다:
```bash
cp .env.example .env
# 그리고 에디터로 열어 값을 채워 넣기
```

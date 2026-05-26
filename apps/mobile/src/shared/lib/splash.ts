// expo-splash-screen 명시 제어 (.claude/rules/monorepo-boundary.md — RN-only API는 shared/lib 격리)
// Issue #9 잔여 / Architect ADR-1·ADR-4
//
// 책임:
//   1) 모듈 import 시점에 preventAutoHideAsync() 즉시 호출
//      → JS 부트(특히 AuthProvider effect)보다 먼저 평가되어 splash 자동 hide 차단.
//      → 호출처: _layout.tsx 최상단에서 side-effect import (`import '@/shared/lib/splash'`).
//   2) hideSplash() — idempotent. AuthProvider가 isReady=true 전환 시 1회 호출.
//      hot reload / race / timeout 후 늦은 응답 등 다중 호출 시 두 번째부터 no-op.
//
// 의도적으로 silent failure: rejection은 splash가 이미 사라진 정상 케이스가 대부분.
import * as SplashScreen from 'expo-splash-screen';

// 모듈 평가 시점 side-effect — preventAutoHideAsync는 Promise 반환이지만
// await 불필요 (호출 fact만 중요). rejection은 splash 모듈 부재(웹/SSR) 정상 케이스.
void SplashScreen.preventAutoHideAsync().catch(() => {
  // no-op
});

let hidden = false;

export const hideSplash = async (): Promise<void> => {
  if (hidden) return;
  hidden = true;
  try {
    await SplashScreen.hideAsync();
  } catch {
    // splash가 이미 사라진 경우 throw — 정상 시나리오로 간주
  }
};

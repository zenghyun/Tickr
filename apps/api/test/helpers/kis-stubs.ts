// e2e 부팅 시 KisTokenService.onModuleInit이 실제 KIS HTTP 호출을 시도하지 않도록 stub 주입.
// 운영 코드에 NODE_ENV=test 분기를 두지 않기 위해 e2e 측에서 override.

export const stubKisTokenService = () => ({
  // async 키워드 없이 Promise.resolve로 시그니처 충족 — require-await 룰 통과.
  onModuleInit: () => Promise.resolve(),
  getToken: () => Promise.resolve('e2e-stub-token'),
  getBaseUrl: () => 'https://stub.kis.example',
  getEnv: () => 'mock' as const,
  getCachedToken: () => null,
  ensureFresh: () => Promise.resolve('e2e-stub-token'),
  isExpiringSoon: () => false,
});

// 5분 cron이라 e2e(1초 이내 종료) 안에선 사실상 발화 안 하지만, 안전망으로 noop 주입.
export const stubKisTokenCron = () => ({
  refreshIfExpiringSoon: () => Promise.resolve(),
});

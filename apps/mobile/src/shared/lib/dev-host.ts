// 실기기(Expo Go)에서 localhost는 폰 자신을 가리켜 dev 서버에 닿지 못한다.
// Metro 호스트(Constants.hostUri, 예: "172.30.1.32:8081")에서 LAN IP를 뽑아
// localhost URL의 호스트를 대체한다 — Wi-Fi가 바뀌어도 자동 추종, .env 수정 불필요.
//
// 운영 빌드/배포에서는 hostUri가 없으므로 입력 URL을 그대로 반환(no-op) — 안전.
// RN-only(expo-constants) 의존이므로 shared/lib에 격리 (.claude/rules/monorepo-boundary.md).
import Constants from 'expo-constants';

const LOCAL_HOSTS = ['localhost', '127.0.0.1'];

// "172.30.1.32:8081" | "exp://172.30.1.32:8081" 등에서 host(IP)만 추출
function getMetroHost(): string | undefined {
  const hostUri =
    Constants.expoConfig?.hostUri ??
    (Constants.expoGoConfig as { debuggerHost?: string } | null | undefined)
      ?.debuggerHost;
  if (!hostUri) return undefined;
  const withoutScheme = hostUri.includes('://')
    ? hostUri.split('://')[1]
    : hostUri;
  const host = withoutScheme.split(':')[0];
  return host || undefined;
}

// scheme://localhost[:port][/path] 의 localhost를 Metro LAN IP로 재작성.
// localhost가 아니면(운영 URL) 그대로 둔다. RN Hermes의 불완전한 URL API를 피해
// 문자열 치환으로 처리.
export function resolveDevUrl(url: string): string {
  const lanHost = getMetroHost();
  if (!lanHost || LOCAL_HOSTS.includes(lanHost)) return url;
  return url.replace(
    /^(\w+:\/\/)(localhost|127\.0\.0\.1)(?=[:/]|$)/,
    `$1${lanHost}`,
  );
}

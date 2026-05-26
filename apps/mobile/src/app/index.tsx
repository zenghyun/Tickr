// 앱 진입점 — 세션 분기 Redirect.
// Architect ADR-1: 양방향 가드의 cold-start 첫 분기 담당.
//   - 세션 있음 → /(tabs)
//   - 세션 없음 → /(auth)/login
//
// AuthProvider의 isReady gate가 마키 깜빡임을 차단(splash → Redirect 1프레임).
// authQueries.session()은 SecureStore 동기 캐시라 isLoading은 사실상 즉시 false.
import { useQuery } from "@tanstack/react-query";

import { authQueries } from "@/entities/auth";
import { Redirect } from "@/shared/lib";

const Index = () => {
  const { data: session, isLoading } = useQuery(authQueries.session());

  if (isLoading) return null;
  return <Redirect href={session ? "/(tabs)" : "/(auth)/login"} />;
};

export default Index;

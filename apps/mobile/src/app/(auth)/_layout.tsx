// (auth) 라우트 그룹 레이아웃 — 세션 있으면 (tabs)로 cascade redirect
// Architect ADR-1: 양방향 가드 ((auth) ↔ (tabs)) — 딥링크 안전 + 로그아웃 자동 cascade
//
// Stack 중첩 회피: 루트 _layout.tsx가 이미 <Stack />을 가지므로 본 그룹은 <Slot />만 사용.
// (auth)/login·signup은 부모 Stack의 형제로 등록되어 push/back 동작 정상.
//
// 가드 조건:
//   - AuthProvider가 isReady 이전에는 children 차단 → 본 layout 마운트 자체가 isReady 이후
//   - authQueries.session()은 staleTime=Infinity + 동기 SecureStore 캐시 → 사실상 즉시 응답
//   - 단, 초기 마운트 시점에 query 캐시 미스 가능 → isLoading 동안 null 반환으로 깜빡임 방지
import { useQuery } from "@tanstack/react-query";
import { Slot } from "expo-router";

import { authQueries } from "@/entities/auth";
import { Redirect } from "@/shared/lib";

const AuthLayout = () => {
  const { data: session, isLoading } = useQuery(authQueries.session());

  if (isLoading) return null;
  if (session) return <Redirect href="/(tabs)" />;

  return <Slot />;
};

export default AuthLayout;

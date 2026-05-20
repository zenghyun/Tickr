// QueryClient 인스턴스 — 앱 전역에서 단일
import { QueryClient } from '@tanstack/react-query';
import { queryDefaults } from '@/shared/config/react-query';

export const queryClient = new QueryClient({
  defaultOptions: queryDefaults,
});

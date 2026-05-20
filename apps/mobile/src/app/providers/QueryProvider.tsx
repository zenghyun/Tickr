// react-query Provider — 앱 루트에서 한 번만 적용
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/shared/api';

interface Props {
  children: React.ReactNode;
}

export function QueryProvider({ children }: Props) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

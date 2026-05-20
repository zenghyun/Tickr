// 비어있는 상태 — 리스트/검색 결과 없을 때
import { View } from 'react-native';
import { cn } from '@/shared/lib';
import { Text } from './Text';

interface Props {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ title, description, action, className }: Props) {
  return (
    <View className={cn('flex-1 items-center justify-center gap-2 px-6 py-10', className)}>
      <Text variant="title" tone="default">
        {title}
      </Text>
      {description && (
        <Text variant="body" tone="muted" className="text-center">
          {description}
        </Text>
      )}
      {action && <View className="mt-4">{action}</View>}
    </View>
  );
}

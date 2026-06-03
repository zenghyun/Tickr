import { View, useColorScheme } from 'react-native';
import { cn } from '@/shared/lib';
import { Text } from '@/shared/ui';

interface Props {
  market: 'KR' | 'US';
}

export const MarketBadge = ({ market }: Props) => {
  const isDark = useColorScheme() === 'dark';
  return (
    <View
      className={cn(
        'rounded-lg px-1.5 py-0.5',
        isDark ? 'bg-surface-2' : 'bg-surface-2-light',
      )}
    >
      <Text variant="caption" tone="muted">
        {market}
      </Text>
    </View>
  );
};

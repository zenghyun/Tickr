import { Pressable, View, useColorScheme } from 'react-native';
import { cn } from '@/shared/lib';
import { Text } from '@/shared/ui';
import type { SymbolSearchResult } from '@tickr/shared';
import { symbolDisplayName } from '@tickr/shared';
import { MarketBadge } from './MarketBadge';

interface Props {
  item: SymbolSearchResult;
  showMarketBadge?: boolean;
  onPress?: (symbol: string) => void;
}

export const SymbolRow = ({ item, showMarketBadge = false, onPress }: Props) => {
  const isDark = useColorScheme() === 'dark';
  const name = symbolDisplayName(item);

  return (
    <Pressable
      className={cn(
        'min-h-[64px] flex-row items-center px-4 py-3',
        isDark ? 'active:bg-surface' : 'active:bg-surface-light',
      )}
      onPress={() => onPress?.(item.symbol)}
      accessibilityRole="button"
      accessibilityLabel={`${name} ${item.symbol}`}
    >
      <View className="flex-1">
        <View className="flex-row items-center gap-1.5">
          <Text variant="title" numberOfLines={1} className="flex-shrink">
            {name}
          </Text>
          {showMarketBadge && <MarketBadge market={item.market} />}
        </View>
        <Text variant="mono-sm" tone="muted">
          {item.symbol}
        </Text>
      </View>
    </Pressable>
  );
};

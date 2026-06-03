import { FlatList, View, useColorScheme } from 'react-native';
import type { SymbolSearchResult } from '@tickr/shared';
import { cn } from '@/shared/lib';
import { EmptyState, Skeleton, Text } from '@/shared/ui';
import { SymbolRow } from '@/entities/symbol';

interface Props {
  query: string;
  data?: SymbolSearchResult[];
  isLoading: boolean;
  isError: boolean;
  onSelect: (symbol: string) => void;
  onRetry: () => void;
}

const SKELETON_COUNT = 6;

const hasMixedMarkets = (items: SymbolSearchResult[]) => {
  const markets = new Set(items.map((i) => i.market));
  return markets.size > 1;
};

const SymbolRowSkeleton = () => (
  <View className="min-h-[64px] px-4 py-3 gap-2" accessibilityElementsHidden>
    <View className="flex-row items-center gap-2">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-4 w-8" />
    </View>
    <Skeleton className="h-3.5 w-16" />
  </View>
);

export const SearchResults = ({ query, data, isLoading, isError, onSelect, onRetry }: Props) => {
  const isDark = useColorScheme() === 'dark';

  if (!query) {
    return (
      <View className="flex-1 items-center justify-center gap-2 px-6">
        <Text variant="body" tone="muted" className="text-center">
          종목명 또는 코드를 입력하세요
        </Text>
      </View>
    );
  }

  if (isError) {
    return (
      <EmptyState
        title="검색 실패"
        description="잠시 후 다시 시도해 주세요."
        action={
          <Text variant="body" tone="primary" onPress={onRetry}>
            다시 시도
          </Text>
        }
      />
    );
  }

  if (isLoading) {
    return (
      <FlatList
        data={Array.from({ length: SKELETON_COUNT }, (_, i) => i)}
        keyExtractor={(i) => String(i)}
        renderItem={() => <SymbolRowSkeleton />}
        ItemSeparatorComponent={() => (
          <View
            className={cn('h-px mx-4', isDark ? 'bg-border' : 'bg-border-light')}
          />
        )}
        scrollEnabled={false}
      />
    );
  }

  if (!data || data.length === 0) {
    return (
      <EmptyState
        title="결과가 없어요"
        description="다른 종목명이나 코드로 검색해 보세요."
      />
    );
  }

  const showBadge = hasMixedMarkets(data);

  return (
    <FlatList
      data={data}
      keyExtractor={(item) => item.symbol}
      renderItem={({ item }) => (
        <SymbolRow item={item} showMarketBadge={showBadge} onPress={onSelect} />
      )}
      ItemSeparatorComponent={() => (
        <View className={cn('h-px mx-4', isDark ? 'bg-border' : 'bg-border-light')} />
      )}
      keyboardShouldPersistTaps="handled"
      contentInsetAdjustmentBehavior="automatic"
    />
  );
};

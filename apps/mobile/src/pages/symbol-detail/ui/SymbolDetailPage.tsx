// 종목 상세 — W5 차트 섹션(헤더 시세 + 캔들 차트)만.
// '내 주식'(W7 holding)·'종목 정보' 섹션은 후속 이슈.
import { ScrollView, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { symbolDisplayName } from '@tickr/shared';
import { quoteQueries, PriceText, ChangeBadge } from '@/entities/quote';
import { symbolQueries } from '@/entities/symbol';
import { PriceChart } from '@/widgets/price-chart';
import { Screen, Skeleton, Text } from '@/shared/ui';

interface Props {
  symbol: string;
}

export const SymbolDetailPage = ({ symbol }: Props) => {
  // 종목명/통화는 symbol 엔티티에서, 시세는 quote 엔티티에서.
  const { data: detail } = useQuery(symbolQueries.detail(symbol));
  const { data: quote } = useQuery(quoteQueries.detail(symbol));

  const currency = detail?.currency ?? 'KRW';
  const name = detail ? symbolDisplayName(detail) : symbol;

  return (
    <Screen padded={false} edges={['left', 'right', 'bottom']}>
      <ScrollView>
        <View className="gap-1 px-4 pt-4">
          <Text variant="title" numberOfLines={1}>
            {name}
          </Text>
          <Text variant="mono-sm" tone="muted">
            {symbol}
          </Text>

          <View className="mt-2 gap-1">
            {quote ? (
              <>
                <PriceText
                  price={quote.price}
                  delta={quote.delta}
                  currency={currency}
                  variant="price-lg"
                />
                <ChangeBadge
                  delta={quote.delta}
                  ratio={quote.ratio}
                  currency={currency}
                />
              </>
            ) : (
              <>
                <Skeleton className="h-9 w-40 rounded-lg" />
                <Skeleton className="h-5 w-28 rounded-lg" />
              </>
            )}
          </View>
        </View>

        <View className="mt-4">
          <PriceChart symbol={symbol} />
        </View>

        <Text variant="caption" tone="muted" className="px-4 py-6 text-center">
          교육·학습 목적의 모의투자입니다. 투자 권유 아님.
        </Text>
      </ScrollView>
    </Screen>
  );
};

// 종목 상세 — W5 차트 섹션(헤더 시세 + 캔들 차트 + 매수/매도 CTA).
// '내 주식'(W7 holding)·'종목 정보' 섹션은 후속 이슈. 실시간 가격(WS)는 W6.
// 매수/매도 OrderSheet 연결은 W7 — 본 페이지는 disabled CTA만 노출.
import { ScrollView, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { symbolDisplayName } from '@tickr/shared';
import { quoteQueries, PriceText, ChangeBadge } from '@/entities/quote';
import { symbolQueries, MarketBadge } from '@/entities/symbol';
import { PriceChart } from '@/widgets/price-chart';
import { SymbolTradeCta } from '@/widgets/symbol-trade-cta';
import { router } from '@/shared/lib';
import { Button, EmptyState, Screen, Skeleton, Text } from '@/shared/ui';

interface Props {
  // 라우터(`app/symbol/[symbol].tsx`)가 useLocalSearchParams로 추출 — undefined 가능.
  // 부재 분기를 페이지가 흡수해 라우터를 얇게 유지(.claude/rules/fsd-structure.md).
  symbol?: string;
}

const NotFound = ({ title, description }: { title: string; description?: string }) => (
  <Screen edges={['top', 'left', 'right', 'bottom']}>
    <EmptyState
      title={title}
      description={description}
      action={
        <Button
          label="돌아가기"
          variant="ghost"
          size="md"
          onPress={() => router.back()}
        />
      }
    />
  </Screen>
);

// symbol 보장 후 본문 — hook 호출이 부재 가드 아래에 오지 않도록 자식으로 분리.
// (Hook 규칙 + TS narrowing 동시 충족 — `as` 단언 불필요)
const SymbolDetailContent = ({ symbol }: { symbol: string }) => {
  const detailQ = useQuery(symbolQueries.detail(symbol));
  const quoteQ = useQuery(quoteQueries.detail(symbol));

  if (detailQ.isError) {
    return (
      <NotFound
        title="종목을 찾을 수 없습니다"
        description="삭제되었거나 잘못된 종목 코드일 수 있습니다."
      />
    );
  }
  if (detailQ.data && !detailQ.data.isActive) {
    return (
      <NotFound
        title="거래 중지된 종목입니다"
        description="상장이 폐지되었거나 매매가 제한된 종목입니다."
      />
    );
  }

  const detail = detailQ.data;
  const quote = quoteQ.data;
  const currency = detail?.currency ?? 'KRW';
  const name = detail ? symbolDisplayName(detail) : symbol;

  return (
    <Screen padded={false} edges={['left', 'right', 'bottom']}>
      <ScrollView className="flex-1">
        <View className="gap-1 px-4 pt-4">
          {detail ? (
            <View className="flex-row items-center gap-1.5">
              <Text variant="title" numberOfLines={1} className="flex-shrink">
                {name}
              </Text>
              <MarketBadge market={detail.market} />
            </View>
          ) : (
            <Skeleton className="h-7 w-40 rounded-lg" />
          )}
          <Text variant="mono-sm" tone="muted">
            {symbol}
          </Text>

          <View className="mt-2 gap-1">
            {quoteQ.isError ? (
              <Text variant="body" tone="muted">
                시세를 불러올 수 없어요.
              </Text>
            ) : quote ? (
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

        <Text variant="caption" tone="muted" className="px-4 pb-4 pt-6 text-center">
          교육·학습 목적의 모의투자입니다. 투자 권유 아님.
        </Text>
      </ScrollView>

      {/* 하단 고정 매수/매도 CTA — W5는 disabled, W7에서 OrderSheet 트리거 주입 */}
      <SymbolTradeCta symbol={symbol} disabled />
    </Screen>
  );
};

export const SymbolDetailPage = ({ symbol }: Props) => {
  if (!symbol) {
    return (
      <NotFound
        title="잘못된 접근입니다"
        description="종목 코드가 전달되지 않았습니다."
      />
    );
  }
  return <SymbolDetailContent symbol={symbol} />;
};

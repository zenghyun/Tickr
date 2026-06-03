// 현재가 텍스트 — formatPrice + 등락 방향 색상 토큰(up/down/flat) + tabular-nums.
// 신규 포맷 로직 금지(shared/lib/format 재사용). WebView/RN-only 의존 없음(entity 레이어).
import { formatPrice, changeDirection } from '@/shared/lib';
import { Text } from '@/shared/ui';
import type { Currency } from '@tickr/shared';

interface Props {
  price: number;
  delta: number; // price - prevClose (색상 방향 결정)
  currency?: Currency;
  variant?: 'price' | 'price-lg';
  className?: string;
}

const voiceTone = (dir: 'up' | 'down' | 'flat'): string =>
  dir === 'up' ? '상승' : dir === 'down' ? '하락' : '보합';

export const PriceText = ({
  price,
  delta,
  currency = 'KRW',
  variant = 'price-lg',
  className,
}: Props) => {
  const dir = changeDirection(delta);
  return (
    <Text
      variant={variant}
      tone={dir}
      tabular
      className={className}
      accessibilityLabel={`현재가 ${formatPrice(price, currency)}, ${voiceTone(dir)}`}
    >
      {formatPrice(price, currency)}
    </Text>
  );
};

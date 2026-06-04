// 종목 상세 하단 고정 매수/매도 CTA — W5에서는 disabled, W7에서 OrderSheet 트리거 주입.
// 매수=up(KR 표준 빨강), 매도=down(파랑). primary 금지. (.claude/rules/kr-finance.md)
import { View, useColorScheme } from 'react-native';
import { cn } from '@/shared/lib';
import { Button } from '@/shared/ui';

interface Props {
  symbol: string;
  // W5: 항상 true(W7에서 OrderSheet 활성 시 false). 미지정 시 안전한 기본값 = true.
  disabled?: boolean;
  onBuy?: () => void;
  onSell?: () => void;
}

export const SymbolTradeCta = ({ symbol, disabled = true, onBuy, onSell }: Props) => {
  const isDark = useColorScheme() === 'dark';
  return (
    <View
      className={cn(
        'flex-row gap-3 border-t px-4 pb-4 pt-3',
        isDark ? 'border-border' : 'border-border-light',
      )}
      accessibilityLabel={`${symbol} 매매`}
    >
      <Button
        label="매수"
        variant="up"
        size="lg"
        disabled={disabled}
        onPress={onBuy}
        className="flex-1"
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        accessibilityHint={disabled ? '곧 매수 기능이 활성화됩니다.' : undefined}
      />
      <Button
        label="매도"
        variant="down"
        size="lg"
        disabled={disabled}
        onPress={onSell}
        className="flex-1"
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        accessibilityHint={disabled ? '곧 매도 기능이 활성화됩니다.' : undefined}
      />
    </View>
  );
};

// 캔들 interval 세그먼트 — API 지원분 [1m, 1d]만. (5m/15m/1h는 후속 resample)
// 도메인(CandleInterval) 결합이라 shared/ui가 아닌 widget 내부에 둔다.
import { Pressable, View, useColorScheme } from 'react-native';
import type { CandleInterval } from '@tickr/shared';
import { cn } from '@/shared/lib';
import { Text } from '@/shared/ui';

const OPTIONS: { value: CandleInterval; label: string; a11y: string }[] = [
  { value: '1m', label: '1분', a11y: '1분봉' },
  { value: '1d', label: '일', a11y: '일봉' },
];

interface Props {
  value: CandleInterval;
  onChange: (value: CandleInterval) => void;
}

export const IntervalToggle = ({ value, onChange }: Props) => {
  const isDark = useColorScheme() === 'dark';
  return (
    <View
      className={cn(
        'flex-row border-b',
        isDark ? 'border-border' : 'border-border-light',
      )}
    >
      {OPTIONS.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            className="min-w-[48px] items-center px-4 py-3"
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${opt.a11y} 차트`}
          >
            <Text
              variant="body"
              tone={active ? 'default' : 'muted'}
              className={cn('pb-1', active && 'border-b-2 border-primary')}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

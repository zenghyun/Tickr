// 등락 뱃지 — '▲ 1,200 (+1.69%)'. formatChange 재사용 + 방향 색상 토큰.
// 색상만으로 의미 전달 금지 → ▲▼ 화살표가 formatChange 출력에 포함됨.
import { formatChange, formatPercent, changeDirection } from '@/shared/lib';
import { Text } from '@/shared/ui';
import type { Currency } from '@tickr/shared';

interface Props {
  delta: number;
  ratio: number;
  currency?: Currency;
  variant?: 'price' | 'caption';
  className?: string;
}

const voiceTone = (dir: 'up' | 'down' | 'flat'): string =>
  dir === 'up' ? '상승' : dir === 'down' ? '하락' : '보합';

export const ChangeBadge = ({
  delta,
  ratio,
  currency = 'KRW',
  variant = 'price',
  className,
}: Props) => {
  const dir = changeDirection(delta);
  // 스크린리더는 ▲▼ 기호를 읽지 못하므로 음성 라벨은 '상승/하락'으로 명시.
  const voice = `등락 ${voiceTone(dir)} ${Math.abs(delta).toLocaleString()} ${formatPercent(ratio)}`;
  return (
    <Text
      variant={variant}
      tone={dir}
      tabular
      className={className}
      accessibilityLabel={voice}
    >
      {formatChange({ delta, ratio, currency })}
    </Text>
  );
};

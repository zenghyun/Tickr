// 카드 컨테이너 — surface 배경 + hairline 보더
import { View, useColorScheme, type ViewProps } from 'react-native';
import { cn } from '@/shared/lib';

interface Props extends ViewProps {
  className?: string;
}

export const Card = ({ className, ...rest }: Props) => {
  const isDark = useColorScheme() === 'dark';
  return (
    <View
      className={cn(
        'rounded-xl border-hairline p-card-p',
        isDark ? 'bg-surface border-border' : 'bg-surface-light border-border-light',
        className,
      )}
      {...rest}
    />
  );
};

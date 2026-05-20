// 토큰 기반 TextInput 래퍼 — label + helper text 지원
import { TextInput, View, useColorScheme, type TextInputProps } from 'react-native';
import { cn } from '@/shared/lib';
import { Text } from './Text';

interface Props extends TextInputProps {
  label?: string;
  helper?: string;
  error?: string;
  containerClassName?: string;
  className?: string;
}

export function Input({
  label,
  helper,
  error,
  containerClassName,
  className,
  style,
  ...rest
}: Props) {
  const isDark = useColorScheme() === 'dark';
  const placeholderColor = isDark ? '#8E8E93' : '#6B6B70';

  return (
    <View className={cn('gap-1', containerClassName)}>
      {label && (
        <Text variant="caption" tone="muted">
          {label}
        </Text>
      )}
      <TextInput
        placeholderTextColor={placeholderColor}
        className={cn(
          'h-11 rounded-lg border-hairline px-3 text-body',
          isDark
            ? 'border-border bg-surface-2 text-text'
            : 'border-border-light bg-surface-2-light text-text-light',
          error && 'border-danger',
          className,
        )}
        style={style}
        {...rest}
      />
      {(helper || error) && (
        <Text variant="caption" tone={error ? 'danger' : 'muted'}>
          {error ?? helper}
        </Text>
      )}
    </View>
  );
}

import { TextInput, View, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cn } from '@/shared/lib';
import { colors } from '@/shared/config';
import { IconButton } from '@/shared/ui';

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  onClear?: () => void;
}

export const SearchInput = ({ value, onChangeText, onClear }: Props) => {
  const isDark = useColorScheme() === 'dark';
  const iconColor = isDark ? colors.text.muted : colors.text['muted-light'];
  const placeholderColor = isDark ? colors.text.muted : colors.text['muted-light'];

  return (
    <View
      className={cn(
        'mx-4 h-11 flex-row items-center rounded-xl px-3 gap-2',
        isDark ? 'bg-surface-2' : 'bg-surface-2-light',
      )}
    >
      <Ionicons name="search-outline" size={18} color={iconColor} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="종목명 또는 코드 검색"
        placeholderTextColor={placeholderColor}
        autoFocus
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel="종목 검색"
        accessibilityHint="종목명 또는 종목코드를 입력하세요"
        className={cn(
          'flex-1 text-body',
          isDark ? 'text-text' : 'text-text-light',
        )}
      />
      {value.length > 0 && (
        <IconButton
          name="close-circle"
          size={18}
          tone="muted"
          accessibilityLabel="검색어 지우기"
          onPress={() => {
            onChangeText('');
            onClear?.();
          }}
          className="w-6 h-6"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        />
      )}
    </View>
  );
};

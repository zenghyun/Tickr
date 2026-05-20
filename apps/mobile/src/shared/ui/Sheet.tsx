// 바텀 시트 — RN Modal 기반 단순 구현
// 향후 @gorhom/bottom-sheet 도입 검토 (현재 단계는 의존성 최소화)
import { Modal, Pressable, View, useColorScheme } from 'react-native';
import { cn } from '@/shared/lib';

interface Props {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /**
   * 시트 헤더에 핸들 표시
   */
  showHandle?: boolean;
  className?: string;
}

export function Sheet({ visible, onClose, children, showHandle = true, className }: Props) {
  const isDark = useColorScheme() === 'dark';

  return (
    <Modal
      visible={visible}
      onRequestClose={onClose}
      transparent
      animationType="slide"
      statusBarTranslucent
    >
      <Pressable className="flex-1 justify-end bg-black/40" onPress={onClose}>
        <Pressable
          className={cn(
            'rounded-t-xl border-t-hairline px-screen-px pb-8 pt-3',
            isDark ? 'bg-surface border-border' : 'bg-surface-light border-border-light',
            className,
          )}
          onPress={(e) => e.stopPropagation()}
        >
          {showHandle && (
            <View
              className={cn(
                'mx-auto mb-3 h-1 w-10 rounded-full',
                isDark ? 'bg-border' : 'bg-border-light',
              )}
            />
          )}
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

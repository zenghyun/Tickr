// 단일 마키 행.
// - symbols 배열을 [...symbols, ...symbols]로 2배 펼쳐 seamless loop 구현(ADR-2).
// - 각 셀: 흰 원형 컨테이너 + expo-image 로고. 매니페스트 미존재 시 LogoFallback.
// - opacity는 인덱스 기반 결정론적(seedOpacity) — flickering 방지.
import { useMemo } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Image } from 'expo-image';
import { getLogo, LogoFallback, seedOpacity, type LogoSymbol } from '@/shared/lib/logo';
import { MARQUEE } from '../config/marquee.config';
import { useMarqueeRow } from '../model/use-marquee-row';

interface MarqueeRowProps {
  symbols: readonly LogoSymbol[];
  rowWidth: number;
  durationMs: number;
  direction: 'ltr' | 'rtl';
  paused: boolean;
}

interface CellItem {
  symbol: LogoSymbol;
  // 2배 펼침 시 중복 심볼 발생 — key 충돌 방지용 합성 인덱스
  cellKey: string;
  opacity: number;
}

export const MarqueeRow = ({ symbols, rowWidth, durationMs, direction, paused }: MarqueeRowProps) => {
  // 2배 펼침은 마운트 1회만. symbols/길이가 바뀌지 않으므로 의존성 비움.
  const cells = useMemo<readonly CellItem[]>(() => {
    const result: CellItem[] = [];
    for (let copy = 0; copy < 2; copy += 1) {
      symbols.forEach((symbol, i) => {
        result.push({
          symbol,
          cellKey: `${copy}-${i}-${symbol}`,
          opacity: seedOpacity(i),
        });
      });
    }
    return result;
  }, [symbols]);

  const { animatedStyle } = useMarqueeRow({ rowWidth, durationMs, direction, paused });

  return (
    <Animated.View style={animatedStyle} className="flex-row">
      {cells.map((cell) => {
        const source = getLogo(cell.symbol);
        return (
          <View
            key={cell.cellKey}
            // gap-4(=16px) = ITEM_GAP. flex-row의 gap 대신 marginRight로 ROW_WIDTH 계산과 일치시킴.
            // (gap은 자식간 간격으로만 적용, 끝에는 미포함이라 ROW_WIDTH 정확도 떨어짐 → marginRight로 통일)
            className="items-center justify-center rounded-full bg-white"
            style={{
              width: MARQUEE.ITEM_SIZE,
              height: MARQUEE.ITEM_SIZE,
              marginRight: MARQUEE.ITEM_GAP,
              opacity: cell.opacity,
            }}
          >
            {source ? (
              <Image
                source={source}
                style={{ width: MARQUEE.LOGO_INNER_SIZE, height: MARQUEE.LOGO_INNER_SIZE }}
                contentFit="contain"
                cachePolicy="memory-disk"
                transition={0}
              />
            ) : (
              <LogoFallback symbol={cell.symbol} size={MARQUEE.ITEM_SIZE} />
            )}
          </View>
        );
      })}
    </Animated.View>
  );
};

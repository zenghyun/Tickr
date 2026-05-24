// 단일 마키 행.
// - symbols 배열을 [...symbols, ...symbols]로 2배 펼쳐 seamless loop 구현(ADR-2).
// - 각 셀 source: getLogo(symbol) — 정적 require 결과. 미스 시 undefined → LogoFallback.
// - opacity는 인덱스 기반 결정론적(seedOpacity) — flickering 방지.
// - 인라인 객체는 useMemo로 사전 빌드 — 200 셀 × 4행 리렌더 시 객체 재생성 비용 회피.
import { useMemo } from 'react';
import { type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { getLogo, seedOpacity, type LogoSymbol } from '@/shared/lib/logo';
import { HIGHLIGHTED_SYMBOLS, MARQUEE } from '../config/marquee.config';
import { useMarqueeRow } from '../model/use-marquee-row';
import { LogoCell } from './LogoCell';

interface MarqueeRowProps {
  symbols: readonly LogoSymbol[];
  rowWidth: number;
  durationMs: number;
  direction: 'ltr' | 'rtl';
  paused: boolean;
  isDark: boolean;
}

interface CellItem {
  symbol: LogoSymbol;
  cellKey: string;
  cellStyle: ViewStyle;
}

export const MarqueeRow = ({
  symbols,
  rowWidth,
  durationMs,
  direction,
  paused,
  isDark,
}: MarqueeRowProps) => {
  // 2배 펼침 + 셀 스타일 사전 빌드 — symbols/길이 안 바뀌므로 deps=[symbols].
  const cells = useMemo<readonly CellItem[]>(() => {
    const result: CellItem[] = [];
    for (let copy = 0; copy < 2; copy += 1) {
      symbols.forEach((symbol, i) => {
        result.push({
          symbol,
          // 2배 펼침 시 중복 심볼 발생 — key 충돌 방지용 합성 인덱스
          cellKey: `${copy}-${i}-${symbol}`,
          cellStyle: {
            width: MARQUEE.ITEM_SIZE,
            height: MARQUEE.ITEM_SIZE,
            marginRight: MARQUEE.ITEM_GAP,
            opacity: seedOpacity(i),
          },
        });
      });
    }
    return result;
  }, [symbols]);

  const { animatedStyle } = useMarqueeRow({ rowWidth, durationMs, direction, paused });

  return (
    <Animated.View style={animatedStyle} className="flex-row">
      {cells.map((cell) => (
        <LogoCell
          key={cell.cellKey}
          symbol={cell.symbol}
          source={getLogo(cell.symbol) ?? null}
          cellStyle={cell.cellStyle}
          isDark={isDark}
          highlighted={HIGHLIGHTED_SYMBOLS.has(cell.symbol)}
        />
      ))}
    </Animated.View>
  );
};

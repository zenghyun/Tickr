// 캔들 차트 위젯 — react-native-webview에 LWC 임베드 (RN-only 격리 구역).
// candles query → ready 후 setData(큰 배열 1회). 테마는 setTheme 메시지로 동기화.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useColorScheme, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { useQuery } from '@tanstack/react-query';
import type { CandleInterval } from '@tickr/shared';
import { quoteQueries } from '@/entities/quote';
import { colors } from '@/shared/config';
import { Text } from '@/shared/ui';
import { buildChartHtml } from '../lib/chart-html';
import type { ChartTheme, HostToChart } from '../model/chart-protocol';
import { IntervalToggle } from './IntervalToggle';

const themeFor = (isDark: boolean): ChartTheme => ({
  background: isDark ? colors.bg.DEFAULT : colors.bg.light,
  text: isDark ? colors.text.muted : colors.text['muted-light'],
  grid: isDark ? colors.border.DEFAULT : colors.border.light,
  up: isDark ? colors.up.DEFAULT : colors.up.light,
  down: isDark ? colors.down.DEFAULT : colors.down.light,
});

interface Props {
  symbol: string;
}

export const PriceChart = ({ symbol }: Props) => {
  const isDark = useColorScheme() === 'dark';
  const [interval, setIntervalValue] = useState<CandleInterval>('1d');
  const webRef = useRef<WebView>(null);
  const ready = useRef(false);

  const theme = useMemo(() => themeFor(isDark), [isDark]);
  // HTML은 1회만 빌드(초기 테마 포함). 이후 테마/데이터는 메시지로 주입.
  const [html] = useState(() => buildChartHtml(themeFor(isDark)));

  const { data: candles, isLoading, isError } = useQuery(
    quoteQueries.candles(symbol, interval),
  );

  // injectJavaScript로 WebView 진입점 호출. 이중 stringify: 바깥은 JS 문자열 리터럴화.
  const send = useCallback((msg: HostToChart) => {
    webRef.current?.injectJavaScript(
      `window.__onHostMessage(${JSON.stringify(JSON.stringify(msg))});true;`,
    );
  }, []);

  // candles 변경 시(ready 이후) 전체 setData.
  useEffect(() => {
    if (ready.current && candles) send({ type: 'setData', candles });
  }, [candles, send]);

  // 다크/라이트 전환 시(ready 이후) 테마 갱신.
  useEffect(() => {
    if (ready.current) send({ type: 'setTheme', theme });
  }, [theme, send]);

  const onMessage = useCallback(
    (e: WebViewMessageEvent) => {
      try {
        const msg = JSON.parse(e.nativeEvent.data) as { type?: string };
        if (msg.type === 'ready') {
          ready.current = true;
          send({ type: 'setTheme', theme });
          if (candles) send({ type: 'setData', candles });
        }
      } catch {
        // ready 외 메시지는 무시
      }
    },
    [candles, theme, send],
  );

  return (
    <View>
      <IntervalToggle value={interval} onChange={setIntervalValue} />
      <View className="h-[280px] w-full">
        <WebView
          ref={webRef}
          originWhitelist={['*']}
          source={{ html }}
          onMessage={onMessage}
          scrollEnabled={false}
          style={{ backgroundColor: 'transparent' }}
          androidLayerType="hardware"
          accessibilityLabel="캔들 차트"
        />
        {(isLoading || isError) && (
          <View className="absolute inset-0 items-center justify-center">
            <Text variant="caption" tone="muted">
              {isError ? '차트를 불러올 수 없어요' : '불러오는 중…'}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

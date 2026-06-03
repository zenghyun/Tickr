// LWC WebView HTML 빌더 — vendored LWC standalone(v5)을 inline 주입.
// CDN 미사용(오프라인/닫힌 베타 안정성). 모든 색상은 ChartTheme(토큰 hex)로 주입 — 하드코딩 금지.
//
// LWC v5 API: chart.addSeries(LightweightCharts.CandlestickSeries, {...}).
// 호스트 메시지 핸들러 window.__onHostMessage(jsonString) — RN이 injectJavaScript로 호출.
// 준비 완료 시 window.ReactNativeWebView.postMessage({type:'ready'}).
import type { ChartTheme } from '../model/chart-protocol';
import { LWC_STANDALONE_JS } from './lwc-standalone';

export function buildChartHtml(initialTheme: ChartTheme): string {
  const themeJson = JSON.stringify(initialTheme);
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<style>
  html, body { margin: 0; padding: 0; height: 100%; overflow: hidden; background: ${initialTheme.background}; }
  #chart { width: 100vw; height: 100vh; }
</style>
</head>
<body>
<div id="chart"></div>
<script>${LWC_STANDALONE_JS}</script>
<script>
(function () {
  var LWC = window.LightweightCharts;
  var el = document.getElementById('chart');
  var theme = ${themeJson};

  var chart = LWC.createChart(el, {
    width: el.clientWidth,
    height: el.clientHeight,
    layout: { background: { color: theme.background }, textColor: theme.text, attributionLogo: false },
    grid: { vertLines: { color: theme.grid }, horzLines: { color: theme.grid } },
    rightPriceScale: { borderColor: theme.grid },
    timeScale: { borderColor: theme.grid, timeVisible: true, secondsVisible: false },
    crosshair: { mode: 0 },
    handleScale: true,
    handleScroll: true,
  });

  var series = chart.addSeries(LWC.CandlestickSeries, {
    upColor: theme.up, downColor: theme.down,
    wickUpColor: theme.up, wickDownColor: theme.down,
    borderUpColor: theme.up, borderDownColor: theme.down,
  });

  function applyTheme(t) {
    theme = t;
    document.body.style.background = t.background;
    chart.applyOptions({
      layout: { background: { color: t.background }, textColor: t.text },
      grid: { vertLines: { color: t.grid }, horzLines: { color: t.grid } },
      rightPriceScale: { borderColor: t.grid },
      timeScale: { borderColor: t.grid },
    });
    series.applyOptions({
      upColor: t.up, downColor: t.down,
      wickUpColor: t.up, wickDownColor: t.down,
      borderUpColor: t.up, borderDownColor: t.down,
    });
  }

  // RN → WebView 진입점
  window.__onHostMessage = function (raw) {
    try {
      var msg = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (msg.type === 'setData') {
        series.setData(msg.candles);
        chart.timeScale().fitContent();
      } else if (msg.type === 'setTheme') {
        applyTheme(msg.theme);
      }
    } catch (e) {}
  };

  window.addEventListener('resize', function () {
    chart.applyOptions({ width: el.clientWidth, height: el.clientHeight });
  });

  function post(m) {
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(m));
  }
  post({ type: 'ready' });
})();
</script>
</body>
</html>`;
}

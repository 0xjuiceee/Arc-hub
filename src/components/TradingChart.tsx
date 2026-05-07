import { useEffect, useRef, useState, useMemo } from 'react';
import {
  createChart,
  ColorType,
  CandlestickSeries,
  AreaSeries,
  type IChartApi,
  type Time,
  type CandlestickData,
} from 'lightweight-charts';

export interface ChartDataPoint {
  time: string;
  price: number;
  marketCap: number;
}

export interface ChartTrade {
  time: string;
  totalArc: number;
  type: string;
}

type ChartMode = 'price' | 'mcap';
type ChartStyle = 'candle' | 'area';

interface TradingChartProps {
  data: ChartDataPoint[];
  trades?: ChartTrade[];
}

/** Auto-detect precision based on price magnitude */
function getAutoPrecision(value: number): { precision: number; minMove: number } {
  if (value === 0) return { precision: 8, minMove: 0.00000001 };
  const abs = Math.abs(value);
  if (abs >= 1000) return { precision: 2, minMove: 0.01 };
  if (abs >= 1) return { precision: 4, minMove: 0.0001 };
  if (abs >= 0.01) return { precision: 6, minMove: 0.000001 };
  if (abs >= 0.0001) return { precision: 8, minMove: 0.00000001 };
  return { precision: 10, minMove: 0.0000000001 };
}

const INTERVALS: { label: string; seconds: number }[] = [
  { label: '1m', seconds: 60 },
  { label: '5m', seconds: 300 },
  { label: '15m', seconds: 900 },
  { label: '1H', seconds: 3600 },
  { label: '4H', seconds: 14400 },
  { label: '1D', seconds: 86400 },
];

/** Pick a sensible default interval that produces at least 2 buckets when possible */
function pickDefaultInterval(points: { time: number }[]): number {
  if (points.length < 2) return 60;
  const sorted = [...points].sort((a, b) => a.time - b.time);
  const span = sorted[sorted.length - 1].time - sorted[0].time;
  // Try from smallest interval; pick the first that gives >=2 buckets
  for (const iv of INTERVALS) {
    if (span >= iv.seconds) return iv.seconds;
  }
  return 60; // fallback to 1m
}

function buildCandles(
  points: { time: number; value: number }[],
  intervalSec: number
) {
  if (points.length === 0) return [];

  // Sort ascending and deduplicate (keep last value per timestamp)
  const sorted = [...points].sort((a, b) => a.time - b.time);
  const deduped: typeof sorted = [];
  for (const p of sorted) {
    if (deduped.length > 0 && deduped[deduped.length - 1].time === p.time) {
      deduped[deduped.length - 1] = p;
    } else {
      deduped.push(p);
    }
  }

  // Build OHLC buckets
  const buckets = new Map<number, { o: number; h: number; l: number; c: number }>();

  for (const p of deduped) {
    const bucket = Math.floor(p.time / intervalSec) * intervalSec;
    const existing = buckets.get(bucket);
    if (existing) {
      existing.h = Math.max(existing.h, p.value);
      existing.l = Math.min(existing.l, p.value);
      existing.c = p.value;
    } else {
      buckets.set(bucket, { o: p.value, h: p.value, l: p.value, c: p.value });
    }
  }

  const sortedBuckets = Array.from(buckets.entries()).sort((a, b) => a[0] - b[0]);
  if (sortedBuckets.length === 0) return [];

  // If only one bucket or all O=H=L=C, add a tiny visual wick so the candle is visible
  const result = sortedBuckets.map(([t, b]) => {
    let { o, h, l, c } = b;
    if (h === l) {
      // Add a tiny visual range (~0.5% of price or minMove, whichever is larger)
      const nudge = Math.max(Math.abs(c) * 0.005, 0.0000000001);
      h = c + nudge;
      l = c - nudge;
    }
    return {
      time: t as Time,
      open: o,
      high: h,
      low: l,
      close: c,
    };
  });

  return result;
}

export const TradingChart = ({ data, trades = [] }: TradingChartProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [mode, setMode] = useState<ChartMode>('price');
  const [style, setStyle] = useState<ChartStyle>('candle');
  const [candleInterval, setCandleInterval] = useState<number | null>(null);
  const [ohlc, setOhlc] = useState<{ o: number; h: number; l: number; c: number; change: number } | null>(null);

  // Reset OHLC display when switching modes
  useEffect(() => { setOhlc(null); }, [mode, style, candleInterval]);

  const rawPoints = useMemo(() => {
    const pts = data
      .filter(d => {
        const v = mode === 'price' ? d.price : d.marketCap;
        return v > 0 && isFinite(v);
      })
      .map(d => ({
        time: Math.floor(new Date(d.time).getTime() / 1000),
        value: mode === 'price' ? d.price : d.marketCap,
      }));
    // Sort ascending and deduplicate by time (keep last value per second)
    pts.sort((a, b) => a.time - b.time);
    const deduped: typeof pts = [];
    for (const p of pts) {
      if (deduped.length > 0 && deduped[deduped.length - 1].time === p.time) {
        deduped[deduped.length - 1] = p;
      } else {
        deduped.push(p);
      }
    }
    return deduped;
  }, [data, mode]);

  const effectiveInterval = candleInterval ?? pickDefaultInterval(rawPoints);

  const isUp = rawPoints.length > 1 && rawPoints[rawPoints.length - 1].value >= rawPoints[0].value;

  const allCandles = useMemo(() => buildCandles(rawPoints, effectiveInterval), [rawPoints, effectiveInterval]);
  const lastCandle = allCandles.length > 0 ? allCandles[allCandles.length - 1] : null;

  const defaultOhlc = lastCandle
    ? {
        o: lastCandle.open,
        h: lastCandle.high,
        l: lastCandle.low,
        c: lastCandle.close,
        change: lastCandle.open !== 0 ? ((lastCandle.close - lastCandle.open) / lastCandle.open) * 100 : 0,
      }
    : null;

  const displayOhlc = ohlc || defaultOhlc;

  const lastValue = rawPoints[rawPoints.length - 1]?.value ?? 0;
  const { precision, minMove } = getAutoPrecision(lastValue);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: 'hsl(220, 10%, 50%)',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.06)' },
        horzLines: { color: 'rgba(255,255,255,0.06)' },
      },
      crosshair: {
        vertLine: { color: 'rgba(139,92,246,0.4)', width: 1, style: 2, labelBackgroundColor: '#7c3aed' },
        horzLine: { color: 'rgba(139,92,246,0.4)', width: 1, style: 2, labelBackgroundColor: '#7c3aed' },
      },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0.1, bottom: 0.1 },
        autoScale: true,
      },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true },
      handleScale: { mouseWheel: true, pinch: true },
    });

    if (style === 'candle') {
      const candleSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#22c55e',
        downColor: '#ef4444',
        borderDownColor: '#ef4444',
        borderUpColor: '#22c55e',
        wickDownColor: '#ef4444',
        wickUpColor: '#22c55e',
        priceFormat: { type: 'price', precision, minMove },
      });

      if (allCandles.length > 0) {
        candleSeries.setData(allCandles);

        const last = allCandles[allCandles.length - 1];
        candleSeries.createPriceLine({
          price: last.close,
          color: last.close >= last.open ? '#22c55e' : '#ef4444',
          lineWidth: 1,
          lineStyle: 2,
          axisLabelVisible: true,
          title: '',
        });
      }

      chart.subscribeCrosshairMove((param) => {
        if (!param || !param.time) {
          setOhlc(null);
          return;
        }
        const d = param.seriesData?.get(candleSeries) as CandlestickData<Time> | undefined;
        if (d && 'open' in d) {
          setOhlc({
            o: d.open,
            h: d.high,
            l: d.low,
            c: d.close,
            change: d.open !== 0 ? ((d.close - d.open) / d.open) * 100 : 0,
          });
        }
      });
    } else {
      const lineColor = isUp ? '#22c55e' : '#ef4444';
      const areaSeries = chart.addSeries(AreaSeries, {
        lineColor,
        topColor: isUp ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)',
        bottomColor: 'rgba(0,0,0,0)',
        lineWidth: 2,
        priceFormat: { type: 'price', precision, minMove },
        crosshairMarkerBackgroundColor: lineColor,
        crosshairMarkerRadius: 4,
        crosshairMarkerBorderWidth: 1,
        crosshairMarkerBorderColor: '#fff',
      });
      const areaData = rawPoints.map(p => ({ time: p.time as Time, value: p.value }));
      if (areaData.length > 0) {
        areaSeries.setData(areaData);
      }
    }

    chart.timeScale().fitContent();
    chartRef.current = chart;

    const resizeObserver = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, style, effectiveInterval, allCandles, precision, minMove, isUp, rawPoints]);

  if (data.length === 0) {
    return (
      <div className="h-[420px] flex items-center justify-center text-muted-foreground font-mono text-sm border border-border rounded-xl bg-card">
        No chart data yet — be the first to trade!
      </div>
    );
  }

  const fmtVal = (v: number) => v.toFixed(precision);

  return (
    <div className="rounded-xl bg-card border border-border overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-4 pt-3 pb-2 border-b border-border flex-wrap">
        <div className="flex items-center gap-0.5 mr-1">
          {INTERVALS.map(iv => (
            <button
              key={iv.seconds}
              onClick={() => setCandleInterval(iv.seconds)}
              className={`px-2 py-1 rounded text-[11px] font-mono font-medium transition-all ${
                effectiveInterval === iv.seconds
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {iv.label}
            </button>
          ))}
        </div>

        <div className="w-px h-4 bg-border mx-1" />

        <button
          onClick={() => setMode(m => m === 'price' ? 'mcap' : 'price')}
          className="px-2.5 py-1 rounded text-[11px] font-mono font-medium transition-all bg-primary/15 text-primary border border-primary/20"
        >
          {mode === 'price' ? 'Price' : 'MCap'}
        </button>

        <div className="w-px h-4 bg-border mx-1" />

        <button
          onClick={() => setStyle('candle')}
          className={`px-2 py-1 rounded text-[11px] font-mono font-medium transition-all ${
            style === 'candle'
              ? 'bg-primary/15 text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Candle
        </button>
        <button
          onClick={() => setStyle('area')}
          className={`px-2 py-1 rounded text-[11px] font-mono font-medium transition-all ${
            style === 'area'
              ? 'bg-primary/15 text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Area
        </button>

        <div className="ml-auto flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${isUp ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className={`text-xs font-mono ${isUp ? 'text-green-400' : 'text-red-400'}`}>
            {fmtVal(lastValue)} {mode === 'price' ? 'aUSD' : 'MCap'}
          </span>
        </div>
      </div>

      {/* OHLC Info Bar */}
      {style === 'candle' && displayOhlc && (
        <div className="flex items-center gap-3 px-4 py-1.5 text-[11px] font-mono border-b border-border/50 bg-secondary/30">
          <span className="text-muted-foreground">
            O <span className="text-foreground">{fmtVal(displayOhlc.o)}</span>
          </span>
          <span className="text-muted-foreground">
            H <span className="text-green-400">{fmtVal(displayOhlc.h)}</span>
          </span>
          <span className="text-muted-foreground">
            L <span className="text-red-400">{fmtVal(displayOhlc.l)}</span>
          </span>
          <span className="text-muted-foreground">
            C <span className="text-foreground">{fmtVal(displayOhlc.c)}</span>
          </span>
          <span className={`${displayOhlc.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {displayOhlc.change >= 0 ? '+' : ''}{displayOhlc.change.toFixed(2)}%
          </span>
        </div>
      )}

      {/* Chart */}
      <div ref={containerRef} className="w-full h-[420px]" />
    </div>
  );
};

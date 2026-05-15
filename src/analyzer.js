import { getKlines, getTicker24h } from "./binance.js";
import { calcEMAArray, calcRSI, calcMACD, calcATR } from "./indicators.js";
import { detectRegime, detect4hBias } from "./regime.js";

// Cluster nearby price levels (within 2%) and keep the strongest
function clusterLevels(levels, pricePct = 0.02) {
  if (!levels.length) return [];
  const sorted = [...levels].sort((a, b) => a - b);
  const clusters = [];
  let group = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] / group[0] - 1 <= pricePct) {
      group.push(sorted[i]);
    } else {
      clusters.push(group.reduce((s, v) => s + v, 0) / group.length);
      group = [sorted[i]];
    }
  }
  clusters.push(group.reduce((s, v) => s + v, 0) / group.length);
  return clusters;
}

// Find swing lows (support) and highs (resistance) using 5-bar pivot
function findLevels(candles, price) {
  const rawSupport = [], rawResistance = [];
  for (let i = 2; i < candles.length - 2; i++) {
    const c = candles[i];
    if (
      c.low < candles[i-1].low && c.low < candles[i-2].low &&
      c.low < candles[i+1].low && c.low < candles[i+2].low
    ) rawSupport.push(c.low);
    if (
      c.high > candles[i-1].high && c.high > candles[i-2].high &&
      c.high > candles[i+1].high && c.high > candles[i+2].high
    ) rawResistance.push(c.high);
  }
  const support    = clusterLevels(rawSupport).filter((l) => l < price).sort((a, b) => b - a).slice(0, 3);
  const resistance = clusterLevels(rawResistance).filter((l) => l > price).sort((a, b) => a - b).slice(0, 3);
  return { support, resistance };
}

function volumeTrend(candles) {
  const vols     = candles.map((c) => c.vol);
  const last     = vols.at(-1);
  const avg20    = vols.slice(-21, -1).reduce((s, v) => s + v, 0) / 20;
  const ratio    = avg20 > 0 ? last / avg20 : 1;
  const label    = ratio > 2 ? "VERY HIGH" : ratio > 1.5 ? "HIGH" : ratio < 0.5 ? "LOW" : "NORMAL";
  return { ratio: +ratio.toFixed(2), label };
}

function genSignal(regime, h4Bias, rsi, price, ema21, support) {
  const nearSupport = support.length > 0 && Math.abs(price - support[0]) / price < 0.03;

  if (regime === "bear" && h4Bias === "bearish")
    return { signal: "AVOID",     emoji: "🚫", reason: "Daily bear regime + 4H bearish" };
  if (regime === "bear")
    return { signal: "WAIT",      emoji: "⏸",  reason: "Daily bear regime — no entry" };
  if (rsi > 72)
    return { signal: "WAIT",      emoji: "⏸",  reason: `RSI ${rsi.toFixed(1)} overbought` };
  if (rsi < 38 && nearSupport)
    return { signal: "ACCUMULATE",emoji: "🛒",  reason: `RSI ${rsi.toFixed(1)} oversold near support` };
  if (rsi < 38)
    return { signal: "WATCH",     emoji: "👀",  reason: `RSI ${rsi.toFixed(1)} oversold — wait for support bounce` };
  if (regime !== "bear" && h4Bias === "bullish" && rsi >= 45 && rsi <= 65 && price > ema21)
    return { signal: "BUY SETUP", emoji: "🟢",  reason: "Regime bullish + 4H up + RSI in range + price above EMA21" };
  if (h4Bias === "bearish")
    return { signal: "WAIT",      emoji: "⏸",  reason: "4H bearish — wait for trend to flip" };
  return   { signal: "WAIT",      emoji: "⏸",  reason: "No clear setup" };
}

export async function analyzeSymbol(symbol) {
  const [d1, h4, h1, ticker] = await Promise.all([
    getKlines(symbol, "1d", 365),
    getKlines(symbol, "4h", 120),
    getKlines(symbol, "1h", 100),
    getTicker24h(symbol),
  ]);

  const price     = parseFloat(ticker.lastPrice);
  const change24h = parseFloat(ticker.priceChangePercent);
  const high24h   = parseFloat(ticker.highPrice);
  const low24h    = parseFloat(ticker.lowPrice);

  // 52-week range
  const w52High = Math.max(...d1.map((c) => c.high));
  const w52Low  = Math.min(...d1.map((c) => c.low));
  const pctFrom52High = ((price - w52High) / w52High) * 100;

  // Daily indicators
  const d1Closes  = d1.map((c) => c.close);
  const ema21d    = calcEMAArray(d1Closes, 21).at(-1);
  const ema50d    = calcEMAArray(d1Closes, 50).at(-1);
  const rsi14d    = calcRSI(d1Closes, 14);
  const atr14d    = calcATR(d1, 14);
  const volTrend  = volumeTrend(d1);

  // Regime + 4H bias
  const { regime } = detectRegime(d1);
  const { bias: h4Bias } = detect4hBias(h4);

  // 1H indicators
  const h1Closes = h1.map((c) => c.close);
  const rsi14h1  = calcRSI(h1Closes, 14);
  const macd1h   = calcMACD(h1Closes);

  // Key levels from daily
  const { support, resistance } = findLevels(d1.slice(-90), price);

  // Signal
  const signalInfo = genSignal(regime, h4Bias, rsi14d, price, ema21d, support);

  return {
    symbol,
    price,
    change24h,
    high24h,
    low24h,
    w52High,
    w52Low,
    pctFrom52High: +pctFrom52High.toFixed(1),
    regime,
    h4Bias,
    rsi14d:   +rsi14d.toFixed(1),
    rsi14h1:  +rsi14h1.toFixed(1),
    ema21d:   +ema21d.toFixed(4),
    ema50d:   +ema50d.toFixed(4),
    atr14d:   +atr14d.toFixed(4),
    macdBullish: macd1h.bullish,
    macdHist:    +macd1h.histogram?.toFixed(4),
    volTrend,
    support,
    resistance,
    ...signalInfo,
  };
}

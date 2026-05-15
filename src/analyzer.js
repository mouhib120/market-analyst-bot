import { getKlines, getTicker24h } from "./binance.js";
import { calcEMAArray, calcRSI, calcMACD, calcATR } from "./indicators.js";
import { detectRegime, detect4hBias } from "./regime.js";

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
  // Sequential calls — CoinGecko throttle is built into binance.js (1.2s per call)
  const d1     = await getKlines(symbol, "1d", 365);
  const h4     = await getKlines(symbol, "4h", 120); // CoinGecko returns 4H candles
  const ticker = await getTicker24h(symbol);
  // Use same h4 data for short-term indicators (CoinGecko has no 1H OHLC endpoint)
  const h4short = h4;

  const price     = parseFloat(ticker.lastPrice);
  const change24h = parseFloat(ticker.priceChangePercent);
  const high24h   = parseFloat(ticker.highPrice);
  const low24h    = parseFloat(ticker.lowPrice);

  // 52-week range
  const w52High = Math.max(...d1.map((c) => c.high));
  const w52Low  = Math.min(...d1.map((c) => c.low));

  // Daily indicators
  const d1Closes = d1.map((c) => c.close);
  const ema21d   = calcEMAArray(d1Closes, 21).at(-1);
  const ema50d   = calcEMAArray(d1Closes, 50).at(-1);
  const rsi14d   = calcRSI(d1Closes, 14);
  const atr14d   = calcATR(d1.slice(-20), 14);

  // Regime + 4H bias
  const { regime, d1Close, d1Ema50 } = detectRegime(d1);
  const { bias: h4Bias } = detect4hBias(h4);

  // 4H short-term indicators (labeled as 4H in the output)
  const h4Closes  = h4short.map((c) => c.close);
  const rsi14h4   = calcRSI(h4Closes, 14);
  const macd4h    = calcMACD(h4Closes);

  // Key levels from last 90 daily bars
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
    regime,
    d1Close:  d1Close  ?? price,
    d1Ema50:  d1Ema50  ?? 0,
    h4Bias,
    rsi14d:   +rsi14d.toFixed(1),
    rsi14h4:  +rsi14h4.toFixed(1),
    ema21d:   +ema21d.toFixed(4),
    ema50d:   +ema50d.toFixed(4),
    atr14d:   +atr14d.toFixed(4),
    macdBullish: macd4h.bullish,
    macdHist:    +(macd4h.histogram ?? 0).toFixed(4),
    // vol=0 from CoinGecko OHLC; pass quoteVolume for context instead
    quoteVolume: parseFloat(ticker.quoteVolume),
    support,
    resistance,
    ...signalInfo,
  };
}

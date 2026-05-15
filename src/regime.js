import { calcEMAArray, calcATR } from "./indicators.js";

const ST_PERIOD = 10;
const ST_MULT   = 3.0;

export function calcSuperTrend(candles, period = ST_PERIOD, mult = ST_MULT) {
  const n = candles.length;
  const trend = new Array(n).fill(0);
  if (n <= period + 1) return trend;
  const trs = [];
  for (let i = 1; i < n; i++) {
    const h = candles[i].high, l = candles[i].low, pc = candles[i - 1].close;
    trs.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }
  const atr = new Array(n).fill(NaN);
  let a = trs.slice(0, period).reduce((x, y) => x + y, 0) / period;
  atr[period] = a;
  for (let i = period; i < trs.length; i++) {
    a = (a * (period - 1) + trs[i]) / period;
    atr[i + 1] = a;
  }
  let upper = NaN, lower = NaN, dir = 1;
  for (let i = period; i < n; i++) {
    const hl2 = (candles[i].high + candles[i].low) / 2;
    const basicUp = hl2 + mult * atr[i];
    const basicDn = hl2 - mult * atr[i];
    const finalUp = (i === period || basicUp < upper || candles[i - 1].close > upper) ? basicUp : upper;
    const finalDn = (i === period || basicDn > lower || candles[i - 1].close < lower) ? basicDn : lower;
    if (i === period) dir = candles[i].close > finalUp ? 1 : -1;
    else if (dir === 1  && candles[i].close < finalDn) dir = -1;
    else if (dir === -1 && candles[i].close > finalUp) dir = 1;
    trend[i] = dir;
    upper = finalUp;
    lower = finalDn;
  }
  return trend;
}

// "bull" = 1d SuperTrend up AND close > EMA50
// "bear" = 1d SuperTrend down AND close < EMA50
// else   = "neutral"
export function detectRegime(d1Candles) {
  if (d1Candles.length < 51) return { regime: "neutral", reason: "insufficient_bars" };
  const closes = d1Candles.map((c) => c.close);
  const ema50  = calcEMAArray(closes, 50);
  const trend  = calcSuperTrend(d1Candles);
  const i      = d1Candles.length - 1;
  const close  = d1Candles[i].close;
  const e50    = ema50[i];
  const st     = trend[i];
  if (st === 1  && close > e50)  return { regime: "bull",    d1Close: close, d1Ema50: e50 };
  if (st === -1 && close < e50)  return { regime: "bear",    d1Close: close, d1Ema50: e50 };
  return                                { regime: "neutral", d1Close: close, d1Ema50: e50 };
}

// "bullish" / "bearish" / "neutral" based on 4h SuperTrend
export function detect4hBias(h4Candles) {
  if (h4Candles.length < 12) return { bias: "neutral" };
  const trend = calcSuperTrend(h4Candles);
  const st    = trend[h4Candles.length - 1];
  if (st === 1)  return { bias: "bullish" };
  if (st === -1) return { bias: "bearish" };
  return               { bias: "neutral" };
}

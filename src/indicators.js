// ── EMA ─────────────────────────────────────────────────────────

export function calcEMAArray(closes, period) {
  const result = new Array(closes.length).fill(NaN);
  if (closes.length < period) return result;
  let sum = 0;
  for (let i = 0; i < period; i++) sum += closes[i];
  result[period - 1] = sum / period;
  const k = 2 / (period + 1);
  for (let i = period; i < closes.length; i++) {
    result[i] = closes[i] * k + result[i - 1] * (1 - k);
  }
  return result;
}

export function calcEMA(closes, period) {
  const arr = calcEMAArray(closes, period);
  return arr[arr.length - 1];
}

// ── RSI (Wilder's SMMA) ─────────────────────────────────────────

export function calcRSI(closes, period = 14) {
  if (closes.length < period + 1) return 50;
  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) avgGain += diff; else avgLoss -= diff;
  }
  avgGain /= period;
  avgLoss /= period;
  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }
  if (avgLoss === 0) return 100;
  return 100 - 100 / (1 + avgGain / avgLoss);
}

// ── MACD (12, 26, 9) ────────────────────────────────────────────

export function calcMACD(closes, fast = 12, slow = 26, signal = 9) {
  const fastArr = calcEMAArray(closes, fast);
  const slowArr = calcEMAArray(closes, slow);
  const macdArr = fastArr.map((v, i) =>
    isNaN(v) || isNaN(slowArr[i]) ? NaN : v - slowArr[i],
  );
  const validMacd = macdArr.filter((v) => !isNaN(v));
  if (validMacd.length < signal) {
    return { macdLine: NaN, signalLine: NaN, histogram: NaN, bullish: false };
  }
  const signalArr = calcEMAArray(validMacd, signal);
  const macdLine   = validMacd[validMacd.length - 1];
  const signalLine = signalArr[signalArr.length - 1];
  const histogram  = macdLine - signalLine;
  return { macdLine, signalLine, histogram, bullish: macdLine > signalLine };
}

// ── ATR (Wilder's SMMA) ─────────────────────────────────────────

export function calcATR(candles, period = 14) {
  if (candles.length < period + 1) return 0;
  const trs = [];
  for (let i = 1; i < candles.length; i++) {
    const h = candles[i].high, l = candles[i].low, pc = candles[i - 1].close;
    trs.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }
  let atr = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < trs.length; i++) {
    atr = (atr * (period - 1) + trs[i]) / period;
  }
  return atr;
}

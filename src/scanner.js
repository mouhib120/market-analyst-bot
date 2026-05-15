import https from "node:https";
import { calcEMAArray, calcRSI, calcATR } from "./indicators.js";
import { getAllTickers, getKlines } from "./binance.js";

const EXCLUDE_CONTAINS = ["UP", "DOWN", "BULL", "BEAR", "LONG", "SHORT"];
const EXCLUDE_STARTS   = ["USDC", "BUSD", "TUSD", "DAI", "FDUSD", "PAXG"];
const EXCLUDE_EXACT    = new Set(["BTCUSDT", "ETHUSDT", "USDCUSDT", "WBTCUSDT"]);

const CONFIG = {
  minQuoteVolume:    10_000_000,
  minPriceChangePct: 5,
  maxPriceChangePct: 30,
  minRVOL:           2.0,
  minRSI:            45,
  maxRSI:            80,
  minScore:          50,
  topN:              3,
};

async function enrichCoin(ticker) {
  try {
    const klines = await getKlines(ticker.symbol, "5m", 21);
    if (!Array.isArray(klines) || klines.length < 21) return null;
    const vols   = klines.map((k) => k.vol);
    const closes = klines.map((k) => k.close);
    const currentVol = vols[vols.length - 1];
    const avgVol     = vols.slice(0, -1).reduce((a, b) => a + b, 0) / (vols.length - 1);
    const rvol       = avgVol > 0 ? currentVol / avgVol : 0;
    if (rvol < CONFIG.minRVOL) return null;
    const rsi14 = calcRSI(closes, 14);
    if (rsi14 < CONFIG.minRSI || rsi14 > CONFIG.maxRSI) return null;
    return {
      symbol:         ticker.symbol,
      price:          closes[closes.length - 1],
      priceChangePct: parseFloat(ticker.priceChangePercent),
      quoteVolume:    parseFloat(ticker.quoteVolume),
      rvol:           +rvol.toFixed(2),
      rsi14:          +rsi14.toFixed(1),
    };
  } catch {
    return null;
  }
}

function score(c) {
  let s = 0;
  const pct = c.priceChangePct;
  if (pct >= 5  && pct < 10) s += 20;
  if (pct >= 10 && pct < 20) s += 30;
  if (pct >= 20)             s += 15;
  if (c.rvol >= 3.0)         s += 15;
  else if (c.rvol >= 2.0)    s += 8;
  if (c.rsi14 >= 50 && c.rsi14 <= 70) s += 15;
  if (c.quoteVolume >= 50_000_000)     s += 10;
  return Math.max(0, Math.min(100, s));
}

export async function runScan() {
  try {
    const all = await getAllTickers();
    if (!Array.isArray(all)) return [];
    const universe = all.filter((t) => {
      if (!t.symbol.endsWith("USDT"))                          return false;
      if (EXCLUDE_EXACT.has(t.symbol))                         return false;
      if (EXCLUDE_CONTAINS.some((k) => t.symbol.includes(k))) return false;
      if (EXCLUDE_STARTS.some((k) => t.symbol.startsWith(k))) return false;
      const vol = parseFloat(t.quoteVolume);
      const pct = parseFloat(t.priceChangePercent);
      return vol >= CONFIG.minQuoteVolume && pct >= CONFIG.minPriceChangePct && pct <= CONFIG.maxPriceChangePct;
    });
    const BATCH = 10;
    const enriched = [];
    for (let i = 0; i < universe.length; i += BATCH) {
      const results = await Promise.allSettled(universe.slice(i, i + BATCH).map(enrichCoin));
      for (const r of results) {
        if (r.status === "fulfilled" && r.value) enriched.push(r.value);
      }
    }
    return enriched
      .map((c) => ({ ...c, score: score(c) }))
      .filter((c) => c.score >= CONFIG.minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, CONFIG.topN);
  } catch {
    return [];
  }
}

export async function getBtcContext() {
  try {
    const [klines, ticker] = await Promise.all([
      getKlines("BTCUSDT", "1h", 50),
      getTicker24h("BTCUSDT"),
    ]);
    const closes = klines.map((k) => k.close);
    const ema9Arr = calcEMAArray(closes, 9);
    const ema20Arr = calcEMAArray(closes, 20);
    const rsi = calcRSI(closes, 14);
    const price = closes.at(-1);
    const e9  = ema9Arr.at(-1);
    const e20 = ema20Arr.at(-1);
    const trend = e9 > e20 ? "bullish" : e9 < e20 ? "bearish" : "flat";
    return {
      price:          +price.toFixed(2),
      rsi14:          +rsi.toFixed(1),
      trend,
      priceChangePct: +parseFloat(ticker.priceChangePercent).toFixed(2),
      volume24h:      +parseFloat(ticker.quoteVolume).toFixed(0),
    };
  } catch (err) {
    return { error: err.message };
  }
}

export async function fetchFearGreed() {
  return new Promise((resolve) => {
    const req = https.get(
      { hostname: "api.alternative.me", path: "/fng/?limit=1&format=json" },
      (r) => {
        let d = "";
        r.on("data", (c) => (d += c));
        r.on("end", () => {
          try {
            const j = JSON.parse(d);
            const v   = parseInt(j.data?.[0]?.value);
            const cls = j.data?.[0]?.value_classification ?? "";
            resolve({ value: isNaN(v) ? null : v, label: cls });
          } catch { resolve({ value: null, label: "" }); }
        });
      },
    );
    req.on("error", () => resolve({ value: null, label: "" }));
    req.setTimeout(5_000, () => { req.destroy(); resolve({ value: null, label: "" }); });
  });
}

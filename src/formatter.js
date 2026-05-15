function fmt(n, decimals = 4) {
  if (n == null || isNaN(n)) return "—";
  return n.toFixed(decimals);
}

function fmtPrice(n) {
  if (n == null || isNaN(n)) return "—";
  if (n >= 1000) return "$" + n.toFixed(0);
  if (n >= 1)    return "$" + n.toFixed(3);
  return "$" + n.toFixed(5);
}

function fmtChange(pct) {
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}

function regimeEmoji(regime) {
  if (regime === "bull")    return "🟢 BULL";
  if (regime === "bear")    return "🔴 BEAR";
  return "🟡 NEUTRAL";
}

function biasEmoji(bias) {
  if (bias === "bullish") return "🟢 Bullish";
  if (bias === "bearish") return "🔴 Bearish";
  return "🟡 Neutral";
}

function rsiLabel(rsi) {
  if (rsi >= 70) return "⚠️ Overbought";
  if (rsi <= 30) return "⚠️ Oversold";
  if (rsi >= 55) return "🟢 Bullish zone";
  if (rsi <= 45) return "🔴 Bearish zone";
  return "🟡 Neutral";
}

function levelList(arr, fmtFn) {
  if (!arr || arr.length === 0) return "—";
  return arr.map(fmtFn).join(" · ");
}

export function formatHeader(btc, fng, movers, watchlistSummary) {
  const now = new Date().toUTCString().replace(/ GMT$/, " UTC");
  const btcChange = btc.error ? "—" : fmtChange(btc.priceChangePct ?? 0);
  const btcPrice  = btc.error ? "—" : fmtPrice(btc.price);
  const btcRSI    = btc.error ? "—" : btc.rsi14;
  const btcTrend  = btc.error ? "—" : (btc.trend === "bullish" ? "📈" : btc.trend === "bearish" ? "📉" : "➡️");

  const fngStr = fng.value != null
    ? `${fng.value} (${fng.label})`
    : "—";

  const moversStr = movers.length > 0
    ? movers.map((m) => `${m.symbol.replace("USDT", "")} ${fmtChange(m.priceChangePct)}`).join(" | ")
    : "None passing filters";

  const wlStr = watchlistSummary.map(({ symbol, signal, emoji }) =>
    `${symbol.replace("USDT", "")} ${emoji}`
  ).join("  ");

  return (
    `<b>🌐 Market Brief · ${now}</b>\n\n` +
    `₿ BTC: ${btcPrice}  ${btcChange}  RSI ${btcRSI}  ${btcTrend}\n` +
    `${fng.value != null && fng.value < 30 ? "😨" : fng.value != null && fng.value > 70 ? "🤩" : "😐"} Fear &amp; Greed: ${fngStr}\n\n` +
    `⚡ Scanner Movers: ${moversStr}\n` +
    `📋 Watchlist: ${wlStr}`
  );
}

export function formatCoinCard(a) {
  const priceStr    = fmtPrice(a.price);
  const changeStr   = fmtChange(a.change24h);
  const supportStr  = levelList(a.support,    fmtPrice);
  const resistStr   = levelList(a.resistance, fmtPrice);
  const pctFromHigh = `${a.pctFrom52High}% from 52w High`;
  const macdStr     = a.macdBullish ? "↑ Bullish" : "↓ Bearish";
  const volStr      = `${a.volTrend.label} (${a.volTrend.ratio}× avg)`;

  return (
    `━━━━━━━━━━━━━━━━━\n` +
    `<b>📊 ${a.symbol}  |  ${priceStr}  ${changeStr}</b>\n` +
    `━━━━━━━━━━━━━━━━━\n` +
    `Regime:  ${regimeEmoji(a.regime)}    4H: ${biasEmoji(a.h4Bias)}\n` +
    `RSI(1D): ${a.rsi14d}  ${rsiLabel(a.rsi14d)}\n` +
    `RSI(1H): ${a.rsi14h1}    MACD: ${macdStr}\n` +
    `EMA21:   ${fmtPrice(a.ema21d)}    EMA50: ${fmtPrice(a.ema50d)}\n` +
    `Volume:  ${volStr}\n\n` +
    `<b>🎯 Key Levels</b>\n` +
    `  Support:    ${supportStr}\n` +
    `  Resistance: ${resistStr}\n` +
    `  52w: H ${fmtPrice(a.w52High)} · L ${fmtPrice(a.w52Low)}  (${pctFromHigh})\n\n` +
    `${a.emoji}  <b>Signal: ${a.signal}</b>\n` +
    `     ${a.reason}`
  );
}

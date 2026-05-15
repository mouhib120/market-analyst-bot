// ── Price helpers ────────────────────────────────────────────────

function fmtPrice(n) {
  if (n == null || isNaN(n)) return "—";
  if (n >= 1000) return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (n >= 1)    return "$" + n.toFixed(3);
  return "$" + n.toFixed(5);
}

function fmtChange(pct) {
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}

function levelList(arr) {
  if (!arr || arr.length === 0) return "none detected";
  return arr.map(fmtPrice).join("  ·  ");
}

// ── Regime explanation ───────────────────────────────────────────

function explainRegime(regime, d1Close, d1Ema50) {
  const pricVsEma = d1Close > d1Ema50
    ? `price (${ fmtPrice(d1Close)}) is ABOVE the 50-day average (${ fmtPrice(d1Ema50)})`
    : `price (${ fmtPrice(d1Close)}) is BELOW the 50-day average (${ fmtPrice(d1Ema50)})`;

  if (regime === "bull") return (
    `🟢 <b>BULL — Big picture uptrend</b>\n` +
    `The daily regime is determined by two tools: SuperTrend and the 50-day EMA.\n` +
    `Right now: the SuperTrend is pointing UP and ${pricVsEma}.\n` +
    `<b>What this means for you:</b> The main trend is UP. Short-term pullbacks (like today) are corrections inside an uptrend — they often resolve higher. This is the best condition for buying dips.`
  );
  if (regime === "bear") return (
    `🔴 <b>BEAR — Big picture downtrend</b>\n` +
    `SuperTrend is pointing DOWN and ${pricVsEma}.\n` +
    `<b>What this means for you:</b> The market is in a downtrend at the highest timeframe. Bounces happen but they get sold. Avoid new long entries until regime flips NEUTRAL or BULL.`
  );
  return (
    `🟡 <b>NEUTRAL — No clear trend</b>\n` +
    `Mixed signals: SuperTrend and EMA50 are not aligned in either direction.\n` +
    `<b>What this means for you:</b> The market is in a transition or sideways phase. Wait for confirmation — either a breakout above with volume (becomes BULL) or a breakdown (becomes BEAR).`
  );
}

// ── 4H bias explanation ──────────────────────────────────────────

function explain4hBias(bias) {
  if (bias === "bullish") return (
    `🟢 <b>BULLISH — Medium-term momentum UP</b>\n` +
    `Each 4H candle = 4 hours of trading. The 4H SuperTrend is pointing UP.\n` +
    `<b>What this means:</b> Over the last 1–2 days, buyers have been winning. This is the "green light" for entries — when the daily regime is also BULL and the 4H is BULLISH, the setup is aligned across two timeframes. High-probability zone.`
  );
  if (bias === "bearish") return (
    `🔴 <b>BEARISH — Medium-term momentum DOWN</b>\n` +
    `The 4H SuperTrend is pointing DOWN — sellers have been in control over the last 1–2 days.\n` +
    `<b>What this means:</b> Even if the daily is BULL, buying into a bearish 4H is fighting the short-term trend. Wait for the 4H to flip back UP before entering. That flip is your entry trigger.`
  );
  return (
    `🟡 <b>NEUTRAL — 4H trend unclear</b>\n` +
    `The 4H SuperTrend is in a transition phase — not enough bars or mixed signals.\n` +
    `<b>What this means:</b> Wait for it to clearly establish direction before acting.`
  );
}

// ── RSI explanation ──────────────────────────────────────────────

function explainRSI(rsi, timeframe) {
  let zone, zoneDesc;
  if (rsi >= 70) {
    zone = "⚠️ OVERBOUGHT";
    zoneDesc = "The coin has risen too fast. Smart money starts taking profit here. Price often pulls back after reaching overbought. Do NOT buy at these levels.";
  } else if (rsi >= 55) {
    zone = "🟢 BULLISH ZONE";
    zoneDesc = "Buyers are in control. Momentum is positive but not extreme. Healthy zone for an ongoing uptrend.";
  } else if (rsi >= 45) {
    zone = "🟡 NEUTRAL";
    zoneDesc = "Neither buyers nor sellers have a clear edge. Market is indecisive — wait for RSI to pick a direction.";
  } else if (rsi >= 30) {
    zone = "🔴 BEARISH ZONE";
    zoneDesc = "Sellers are in control. Momentum is negative. Avoid entries until RSI recovers above 45.";
  } else {
    zone = "🆘 OVERSOLD";
    zoneDesc = "Selling has been extreme and aggressive. Oversold doesn't mean 'buy immediately' — but it does signal that the selling wave is near exhaustion. A technical bounce is likely soon. Watch for RSI to cross back above 30 as the first sign of recovery.";
  }

  return (
    `📊 <b>RSI ${timeframe}: ${rsi}  —  ${zone}</b>\n` +
    `RSI (Relative Strength Index) measures buying vs selling momentum on a scale of 0–100.\n` +
    `  • Below 30 = Oversold (sellers exhausted, bounce likely)\n` +
    `  • 30–45    = Bearish zone\n` +
    `  • 45–55    = Neutral\n` +
    `  • 55–70    = Bullish zone (buyers in control)\n` +
    `  • Above 70 = Overbought (price may pull back)\n` +
    `At ${rsi}, ${zoneDesc}`
  );
}

// ── MACD explanation ─────────────────────────────────────────────

function explainMACD(bullish, histogram) {
  const dir    = bullish ? "🟢 BULLISH CROSS" : "🔴 BEARISH CROSS";
  const histStr = histogram != null && !isNaN(histogram) ? histogram.toFixed(5) : "—";
  const histDesc = histogram > 0
    ? `The histogram is positive (${histStr}) — bullish momentum is growing.`
    : `The histogram is negative (${histStr}) — bearish momentum is growing.`;

  const meaning = bullish
    ? "The MACD line has crossed ABOVE the signal line. This means short-term momentum has flipped from negative to positive — buyers are gaining strength. Often a reliable early signal that a bottom is forming."
    : "The MACD line has crossed BELOW the signal line. This means short-term momentum has flipped from positive to negative — sellers are gaining strength. Confirms the short-term downward pressure.";

  return (
    `📉 <b>MACD (4H): ${dir}</b>\n` +
    `MACD compares two moving averages (12-period vs 26-period EMA) to show momentum shifts.\n` +
    `  • MACD line crosses UP → bullish momentum building\n` +
    `  • MACD line crosses DOWN → bearish momentum building\n` +
    `  • Histogram bars → strength of the current momentum\n` +
    `${meaning}\n` +
    `${histDesc}`
  );
}

// ── EMA explanation ──────────────────────────────────────────────

function explainEMAs(price, ema21, ema50) {
  const above21 = price > ema21;
  const above50 = price > ema50;

  const pos21  = above21 ? `✅ ABOVE` : `❌ BELOW`;
  const pos50  = above50 ? `✅ ABOVE` : `❌ BELOW`;
  const bull21 = above21 ? "short-term bullish" : "short-term bearish";
  const bull50 = above50 ? "main trend is UP" : "main trend is DOWN";

  return (
    `📏 <b>Moving Averages (EMAs)</b>\n` +
    `EMAs (Exponential Moving Averages) are smoothed trend lines that follow price. They act as dynamic support/resistance — price bounces off them in uptrends and gets rejected at them in downtrends.\n\n` +
    `EMA21 (21-day): ${fmtPrice(ema21)}  — Price is ${pos21}  → ${bull21}\n` +
    `The EMA21 is a short-term trend filter. In a healthy uptrend, price stays above it. A drop below the EMA21 is an early warning sign.\n\n` +
    `EMA50 (50-day): ${fmtPrice(ema50)}  — Price is ${pos50}  → ${bull50}\n` +
    `The EMA50 is the most important moving average for swing traders. Being above it = the trend is your friend. Being below it = you're swimming against the current.`
  );
}

// ── Volume explanation ───────────────────────────────────────────

function fmtVolume(usd) {
  if (usd >= 1e9) return `$${(usd / 1e9).toFixed(1)}B`;
  if (usd >= 1e6) return `$${(usd / 1e6).toFixed(0)}M`;
  return `$${(usd / 1e3).toFixed(0)}K`;
}

function explainVolume(quoteVolume, change24h) {
  const isDown = change24h < 0;
  const vol = typeof quoteVolume === "number" ? quoteVolume : parseFloat(quoteVolume) || 0;
  const volStr = fmtVolume(vol);

  let sizeLabel, sizeDesc;
  if (vol >= 500_000_000) {
    sizeLabel = "🔥 MASSIVE";
    sizeDesc = "Extremely high participation — major institutions and market makers are active.";
  } else if (vol >= 100_000_000) {
    sizeLabel = "💪 HIGH";
    sizeDesc = "Strong participation. This coin is on everyone's radar today.";
  } else if (vol >= 30_000_000) {
    sizeLabel = "🟡 MODERATE";
    sizeDesc = "Average activity. Normal trading day for a mid-cap coin.";
  } else {
    sizeLabel = "📉 LOW";
    sizeDesc = "Light participation. Moves may not have strong follow-through.";
  }

  const interpretation = isDown
    ? vol >= 100_000_000
      ? `⚠️ HIGH volume on a DOWN day = aggressive selling. Smart money is exiting. The drop has strong confirmation — be cautious.`
      : `💡 Moderate/low volume on a DOWN day = weak selling. This looks like a normal pullback, not panic. Could bounce quickly.`
    : vol >= 100_000_000
      ? `💪 HIGH volume on an UP day = strong buying conviction. Institutions are participating. This move has real support.`
      : `⚠️ Lower volume on an UP day = the rally lacks maximum conviction. Watch if volume increases to confirm the move.`;

  return (
    `📦 <b>24H Volume: ${volStr}  —  ${sizeLabel}</b>\n` +
    `Volume tells you HOW MANY people are participating in the move. It's the "fuel" behind price changes.\n` +
    `  • High volume on UP day   = strong, confirmed rally\n` +
    `  • High volume on DOWN day = strong, confirmed selloff\n` +
    `  • Low volume on UP day    = weak bounce (likely to fail)\n` +
    `  • Low volume on DOWN day  = weak dip (likely to recover)\n` +
    `${sizeDesc}\n` +
    `${interpretation}`
  );
}

// ── Key levels explanation ───────────────────────────────────────

function explainLevels(support, resistance, w52High, w52Low, price) {
  const pctFromHigh = (((price - w52High) / w52High) * 100).toFixed(1);
  const pctFromLow  = (((price - w52Low)  / w52Low)  * 100).toFixed(1);

  const nearestSupport    = support[0]    ? fmtPrice(support[0])    : "none";
  const nearestResistance = resistance[0] ? fmtPrice(resistance[0]) : "none";
  const supportDist       = support[0]    ? (((price - support[0]) / price) * 100).toFixed(1) : null;
  const resistanceDist    = resistance[0] ? (((resistance[0] - price) / price) * 100).toFixed(1) : null;

  return (
    `🎯 <b>Key Price Levels</b>\n` +
    `These are price zones where buyers (support) and sellers (resistance) are historically strongest.\n\n` +
    `<b>Support levels</b> — where buyers step in and stop the fall:\n` +
    `  ${levelList(support)}\n` +
    (supportDist ? `  → Nearest support is ${supportDist}% below current price\n` : "") +
    `\n<b>Resistance levels</b> — where sellers appear and cap the rally:\n` +
    `  ${levelList(resistance)}\n` +
    (resistanceDist ? `  → Nearest resistance is ${resistanceDist}% above current price\n` : "") +
    `\n<b>52-week context:</b>\n` +
    `  All-time yearly High: ${fmtPrice(w52High)}  (price is ${pctFromHigh}% from the top)\n` +
    `  All-time yearly Low:  ${fmtPrice(w52Low)}  (price is +${pctFromLow}% above the bottom)\n` +
    `The further price is from the 52w High, the more room it has to recover in a bull market.`
  );
}

// ── Signal explanation ───────────────────────────────────────────

function explainSignal(signal, emoji, reason, regime, h4Bias, rsi14d) {
  const howToTrade = {
    "BUY SETUP": (
      `<b>How to trade it:</b> All conditions are aligned. Consider entering with a position. Place your stop loss below the nearest support level. Target the nearest resistance as TP1.`
    ),
    "ACCUMULATE": (
      `<b>How to trade it:</b> Price is near support and oversold. Instead of buying all at once, buy in small portions (accumulate) — in case price drops a bit more. Set alerts at lower support levels as backup entry zones.`
    ),
    "WATCH": (
      `<b>What to do:</b> Set a price alert at the nearest support level. When price touches it AND RSI starts recovering (crosses back above 30), that's your cue to start watching for an entry.`
    ),
    "WAIT": (
      `<b>What to do:</b> Stay on the sidelines. Do not force an entry. The market is telling you conditions aren't right yet. Check again in 4 hours.`
    ),
    "AVOID": (
      `<b>What to do:</b> Do NOT enter. Both the daily and 4H trend are down — buying here means fighting two timeframes at once. Wait for the regime to shift before revisiting.`
    ),
  };

  return (
    `${emoji} <b>SIGNAL: ${signal}</b>\n` +
    `<b>Reason:</b> ${reason}\n\n` +
    `<b>Full context:</b>\n` +
    `  Daily regime: ${regime.toUpperCase()}  |  4H bias: ${h4Bias.toUpperCase()}  |  RSI: ${rsi14d}\n\n` +
    (howToTrade[signal] ?? "")
  );
}

// ── BTC context explanation ──────────────────────────────────────

function explainBTC(btc) {
  if (btc.error) return `₿ BTC: data unavailable (${btc.error})`;
  const trendEmoji = btc.trend === "bullish" ? "📈" : btc.trend === "bearish" ? "📉" : "➡️";
  const trendMeaning = btc.trend === "bullish"
    ? "Bitcoin's short-term momentum is UP — this creates a favorable environment for altcoins."
    : btc.trend === "bearish"
    ? "Bitcoin's short-term momentum is DOWN — this typically drags altcoins down harder."
    : "Bitcoin is moving sideways — altcoins may trade independently.";
  const changeStr = fmtChange(btc.priceChangePct ?? 0);
  return (
    `₿ <b>Bitcoin (BTC): ${fmtPrice(btc.price)}  ${changeStr}  RSI ${btc.rsi14}  ${trendEmoji}</b>\n` +
    `BTC is the market leader — it sets the direction for 90% of altcoins. When BTC drops, alts drop harder. When BTC rallies, alts rally harder.\n` +
    `${trendMeaning}`
  );
}

// ── Fear & Greed explanation ─────────────────────────────────────

function explainFNG(fng) {
  if (fng.value == null) return `😐 Fear &amp; Greed: unavailable`;
  let emoji, meaning;
  if (fng.value >= 75) {
    emoji = "🤩";
    meaning = `Extreme Greed (${fng.value}/100) — Everyone is euphoric and buying. Historically, this is when you should be CAUTIOUS. Markets tend to reverse when everyone is greedy.`;
  } else if (fng.value >= 55) {
    emoji = "😊";
    meaning = `Greed (${fng.value}/100) — Investors are optimistic. Good environment for existing positions but be selective with new entries.`;
  } else if (fng.value >= 45) {
    emoji = "😐";
    meaning = `Neutral (${fng.value}/100) — Market sentiment is balanced. No extreme fear or greed.`;
  } else if (fng.value >= 25) {
    emoji = "😨";
    meaning = `Fear (${fng.value}/100) — Investors are scared and selling. Historically, this is when the BEST buying opportunities appear. As Warren Buffett says: "Be greedy when others are fearful."`;
  } else {
    emoji = "🆘";
    meaning = `Extreme Fear (${fng.value}/100) — Panic in the market. Maximum fear often marks major bottoms. Historically, buying during extreme fear gives the best long-term returns.`;
  }
  return (
    `${emoji} <b>Fear &amp; Greed Index: ${fng.value}/100  (${fng.label})</b>\n` +
    `This index measures overall market sentiment from 0 (maximum fear) to 100 (maximum greed).\n` +
    `  0–25   = Extreme Fear → potential buying opportunity\n` +
    `  25–45  = Fear → cautious market\n` +
    `  45–55  = Neutral\n` +
    `  55–75  = Greed → positive momentum\n` +
    `  75–100 = Extreme Greed → be careful, reversal risk\n` +
    `${meaning}`
  );
}

// ── Public exports ───────────────────────────────────────────────

export function formatHeader(btc, fng, movers, watchlistSummary) {
  const now = new Date().toUTCString().replace(/ GMT$/, " UTC");
  const moversStr = movers.length > 0
    ? movers.map((m) => `${m.symbol.replace("USDT","")} ${fmtChange(m.priceChangePct)} 🔥`).join("  |  ")
    : "None passing filters right now";

  const wlStr = watchlistSummary
    .map(({ symbol, emoji }) => `${symbol.replace("USDT","")} ${emoji}`)
    .join("   ");

  return (
    `<b>🌐 Market Brief  ·  ${now}</b>\n` +
    `${"─".repeat(32)}\n\n` +
    explainBTC(btc) + "\n\n" +
    explainFNG(fng) + "\n\n" +
    `${"─".repeat(32)}\n` +
    `⚡ <b>Scanner — Top Movers Today:</b>\n` +
    `${moversStr}\n` +
    `(These coins have unusual volume + price momentum passing all filters)\n\n` +
    `📋 <b>Watchlist Summary:</b>  ${wlStr}`
  );
}

export function formatCoinCard(a) {
  const lines = [];

  lines.push(
    `${"═".repeat(34)}\n` +
    `<b>📊 ${a.symbol}  —  Deep Analysis</b>\n` +
    `${"═".repeat(34)}\n\n` +
    `💰 <b>Price: ${fmtPrice(a.price)}  |  24h: ${fmtChange(a.change24h)}</b>\n` +
    `Today's range: ${fmtPrice(a.low24h)} – ${fmtPrice(a.high24h)}\n`
  );

  lines.push("─".repeat(32));
  lines.push(explainRegime(a.regime, a.d1Close ?? a.price, a.ema50d));

  lines.push("─".repeat(32));
  lines.push(explain4hBias(a.h4Bias));

  lines.push("─".repeat(32));
  lines.push(explainRSI(a.rsi14d, "Daily"));

  lines.push("─".repeat(32));
  lines.push(explainRSI(a.rsi14h4, "4-Hour"));

  lines.push("─".repeat(32));
  lines.push(explainMACD(a.macdBullish, a.macdHist));

  lines.push("─".repeat(32));
  lines.push(explainEMAs(a.price, a.ema21d, a.ema50d));

  lines.push("─".repeat(32));
  lines.push(explainVolume(a.quoteVolume, a.change24h));

  lines.push("─".repeat(32));
  lines.push(explainLevels(a.support, a.resistance, a.w52High, a.w52Low, a.price));

  lines.push("─".repeat(32));
  lines.push(explainSignal(a.signal, a.emoji, a.reason, a.regime, a.h4Bias, a.rsi14d));

  return lines.join("\n\n");
}

// Split a long card into Telegram-safe chunks (max 4000 chars each)
export function splitIntoMessages(text, maxLen = 4000) {
  if (text.length <= maxLen) return [text];
  const separator = "\n─".repeat(16);
  const parts = text.split(separator);
  const chunks = [];
  let current = "";
  for (const part of parts) {
    const candidate = current ? current + separator + part : part;
    if (candidate.length > maxLen && current) {
      chunks.push(current);
      current = part;
    } else {
      current = candidate;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

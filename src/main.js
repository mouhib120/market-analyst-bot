import "./load-env.js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

import { getBtcContext, fetchFearGreed, runScan } from "./scanner.js";
import { analyzeSymbol } from "./analyzer.js";
import { formatHeader, formatCoinCard, splitIntoMessages } from "./formatter.js";
import { sendMessage } from "./telegram.js";

const __dir   = dirname(fileURLToPath(import.meta.url));
const watchlist = JSON.parse(readFileSync(join(__dir, "..", "watchlist.json"), "utf8"));

async function main() {
  const cycleStart = new Date().toISOString();
  console.log(`\n[${cycleStart}] Market analyst cycle start`);

  // ── 1. Global market context ───────────────────────────────────
  const [btc, fng, movers] = await Promise.all([
    getBtcContext(),
    fetchFearGreed(),
    runScan(),
  ]);

  console.log(`  BTC: $${btc.price ?? "—"} | RSI ${btc.rsi14 ?? "—"} | ${btc.trend ?? "—"}`);
  console.log(`  F&G: ${fng.value ?? "—"} (${fng.label ?? "—"})`);
  console.log(`  Scanner movers: ${movers.length > 0 ? movers.map((m) => m.symbol).join(", ") : "none"}`);

  // ── 2. Analyze each watchlist coin ────────────────────────────
  const analyses = [];
  for (const symbol of watchlist) {
    try {
      console.log(`  Analyzing ${symbol}...`);
      const a = await analyzeSymbol(symbol);
      analyses.push(a);
      console.log(`    ${a.symbol}: $${a.price} | ${a.regime} | RSI ${a.rsi14d} | ${a.signal}`);
    } catch (err) {
      console.error(`  ${symbol} failed: ${err.message}`);
    }
  }

  // ── 3. Build and send messages ─────────────────────────────────
  const watchlistSummary = analyses.map((a) => ({
    symbol: a.symbol, signal: a.signal, emoji: a.emoji,
  }));

  const header = formatHeader(btc, fng, movers, watchlistSummary);
  await sendMessage(header);
  console.log("  Header sent");

  for (const a of analyses) {
    const card   = formatCoinCard(a);
    const chunks = splitIntoMessages(card);
    for (const chunk of chunks) await sendMessage(chunk);
    console.log(`  Card sent: ${a.symbol} (${chunks.length} message(s))`);
  }

  // ── 4. Scanner movers cards (if any) ──────────────────────────
  for (const mover of movers) {
    if (watchlist.includes(mover.symbol)) continue;
    try {
      console.log(`  Analyzing scanner mover ${mover.symbol}...`);
      const a      = await analyzeSymbol(mover.symbol);
      const card   = "⚡ <b>Scanner Alert</b>\n" + formatCoinCard(a);
      const chunks = splitIntoMessages(card);
      for (const chunk of chunks) await sendMessage(chunk);
      console.log(`  Mover card sent: ${mover.symbol} (${chunks.length} message(s))`);
    } catch (err) {
      console.error(`  Mover ${mover.symbol} failed: ${err.message}`);
    }
  }

  console.log(`[${new Date().toISOString()}] Cycle complete`);
}

main().catch((err) => {
  console.error("Fatal:", err.stack || err.message);
  process.exit(1);
});

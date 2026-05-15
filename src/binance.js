// Public crypto data via CoinGecko API — no geo-blocking, no auth needed.

import https from "node:https";

const HOST = "api.coingecko.com";

// Rate limit: CoinGecko free tier ~10-30 req/min. We enforce 1.2s minimum gap.
let _nextCallAt = 0;
function throttle() {
  const wait = _nextCallAt - Date.now();
  _nextCallAt = Math.max(Date.now(), _nextCallAt) + 1200;
  return wait > 0 ? new Promise((r) => setTimeout(r, wait)) : Promise.resolve();
}

// Binance symbol → CoinGecko coin ID
const COIN_IDS = {
  BTCUSDT:    "bitcoin",
  ETHUSDT:    "ethereum",
  SUIUSDT:    "sui",
  SOLUSDT:    "solana",
  HBARUSDT:   "hedera-hashgraph",
  BNBUSDT:    "binancecoin",
  XRPUSDT:    "ripple",
  ADAUSDT:    "cardano",
  AVAXUSDT:   "avalanche-2",
  DOTUSDT:    "polkadot",
  LINKUSDT:   "chainlink",
  LTCUSDT:    "litecoin",
  ATOMUSDT:   "cosmos",
  NEARUSDT:   "near",
  APTUSDT:    "aptos",
  ARBUSDT:    "arbitrum",
  OPUSDT:     "optimism",
  INJUSDT:    "injective-protocol",
  ONDOUSDT:   "ondo-finance",
  PENDLEUSDT: "pendle",
  STXUSDT:    "blockstack",
  TIAUSDT:    "celestia",
  WIFUSDT:    "dogwifcoin",
  JUPUSDT:    "jupiter-exchange-solana",
  SEIUSDT:    "sei-network",
  WLDUSDT:    "worldcoin-wld",
  FTMUSDT:    "fantom",
  TONUSDT:    "the-open-network",
};

function toId(symbol) {
  return COIN_IDS[symbol] ?? symbol.replace(/USDT$/i, "").toLowerCase();
}

function get(path) {
  return new Promise((resolve, reject) => {
    const req = https.get({ hostname: HOST, path }, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => {
        try {
          const j = JSON.parse(d);
          if (j?.status?.error_code) {
            return reject(new Error(`CoinGecko (${j.status.error_code}): ${j.status.error_message}`));
          }
          resolve(j);
        } catch (e) {
          reject(new Error(`Parse failed: ${d.slice(0, 200)}`));
        }
      });
    });
    req.on("error", reject);
    req.setTimeout(15_000, () => { req.destroy(new Error("timeout")); });
  });
}

// CoinGecko OHLC granularity (fixed by `days` parameter):
//   days=1   → 30-min candles
//   days=90  → 4-hourly candles  (~540 bars)
//   days=365 → daily candles     (~365 bars)
//
// interval mapping:
//   "1d" → days=365 (daily)
//   "4h" → days=90  (4H)
//   "1h" → days=90  (4H — closest available; label accordingly in formatter)
//   "5m" → days=1   (30-min — closest available)
export async function getKlines(symbol, interval, limit = 200) {
  await throttle();
  const id = toId(symbol);
  const days = interval === "1d" ? 365 : interval === "5m" ? 1 : 90;
  const data = await get(`/api/v3/coins/${id}/ohlc?vs_currency=usd&days=${days}`);
  if (!Array.isArray(data)) throw new Error(`getKlines: unexpected response for ${symbol}`);
  return data.slice(-limit).map((c) => ({
    ts:    c[0],
    open:  parseFloat(c[1]),
    high:  parseFloat(c[2]),
    low:   parseFloat(c[3]),
    close: parseFloat(c[4]),
    vol:   0, // CoinGecko OHLC endpoint does not include per-bar volume
  }));
}

export async function getPrice(symbol) {
  await throttle();
  const id = toId(symbol);
  const data = await get(`/api/v3/simple/price?ids=${id}&vs_currencies=usd`);
  if (!data[id]) throw new Error(`getPrice: no data for ${symbol}`);
  return data[id].usd;
}

export async function getTicker24h(symbol) {
  await throttle();
  const id = toId(symbol);
  const d = await get(
    `/api/v3/coins/${id}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false`
  );
  const md = d.market_data;
  return {
    symbol,
    priceChangePercent: String(+(md.price_change_percentage_24h ?? 0).toFixed(2)),
    quoteVolume:        String(md.total_volume?.usd ?? 0),
    lastPrice:          String(md.current_price?.usd ?? 0),
    highPrice:          String(md.high_24h?.usd ?? 0),
    lowPrice:           String(md.low_24h?.usd ?? 0),
  };
}

// Returns array in Binance ticker format for scanner compatibility.
export async function getAllTickers() {
  await throttle();
  const data = await get(
    `/api/v3/coins/markets?vs_currency=usd&order=volume_desc&per_page=250&page=1&price_change_percentage=24h&sparkline=false`
  );
  if (!Array.isArray(data)) return [];
  return data.map((c) => ({
    symbol:             c.symbol.toUpperCase() + "USDT",
    priceChangePercent: String(+(c.price_change_percentage_24h ?? 0).toFixed(2)),
    quoteVolume:        String(c.total_volume ?? 0),
    lastPrice:          String(c.current_price ?? 0),
  }));
}

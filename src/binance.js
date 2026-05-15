// Public-only Binance client — no auth, no orders.
// All endpoints use api.binance.com which is accessible from GitHub Actions.

import https from "node:https";

const HOST = "api.binance.com";

function get(path) {
  return new Promise((resolve, reject) => {
    const req = https.get({ hostname: HOST, path }, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => {
        try {
          const j = JSON.parse(d);
          // Catch any Binance error object — code may be 0, negative, or a string
          if (!Array.isArray(j) && j.code !== undefined && j.msg) {
            console.error(`[binance] ${path} → error (${j.code}): ${j.msg}`);
            return reject(new Error(`Binance error (${j.code}): ${j.msg}`));
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

export async function getKlines(symbol, interval, limit = 200) {
  const data = await get(`/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`);
  return data.map((c) => ({
    ts:    parseInt(c[0]),
    open:  parseFloat(c[1]),
    high:  parseFloat(c[2]),
    low:   parseFloat(c[3]),
    close: parseFloat(c[4]),
    vol:   parseFloat(c[5]),
  }));
}

export async function getPrice(symbol) {
  const data = await get(`/api/v3/ticker/price?symbol=${symbol}`);
  return parseFloat(data.price);
}

export async function getTicker24h(symbol) {
  return get(`/api/v3/ticker/24hr?symbol=${symbol}`);
}

export async function getAllTickers() {
  return get(`/api/v3/ticker/24hr`);
}

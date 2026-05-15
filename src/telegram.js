import https from "node:https";

// Telegram allows max 1 message/second to the same chat.
let _nextSendAt = 0;
function throttle() {
  const wait = _nextSendAt - Date.now();
  _nextSendAt = Math.max(Date.now(), _nextSendAt) + 1100;
  return wait > 0 ? new Promise((r) => setTimeout(r, wait)) : Promise.resolve();
}

export async function sendMessage(text, attempt = 1) {
  await throttle();

  const token  = (process.env.TELEGRAM_BOT_TOKEN  ?? "").trim();
  const chatId = (process.env.TELEGRAM_CHAT_ID ?? "").trim();
  if (!token || !chatId) {
    console.log("[telegram] no credentials — printing to console:\n" + text);
    return;
  }

  const body = JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" });

  const result = await new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "api.telegram.org",
        path:     `/bot${token}/sendMessage`,
        method:   "POST",
        headers:  { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
      },
      (res) => {
        let d = "";
        res.on("data", (c) => (d += c));
        res.on("end", () => {
          try { resolve(JSON.parse(d)); }
          catch { resolve({ ok: false, description: "parse error" }); }
        });
      },
    );
    req.on("error", reject);
    req.setTimeout(10_000, () => { req.destroy(new Error("timeout")); });
    req.write(body);
    req.end();
  });

  if (!result.ok) {
    const retryAfter = result.parameters?.retry_after ?? 5;
    if (result.error_code === 429 && attempt <= 3) {
      console.warn(`[telegram] rate limited — retrying in ${retryAfter}s (attempt ${attempt})`);
      await new Promise((r) => setTimeout(r, retryAfter * 1000 + 500));
      return sendMessage(text, attempt + 1);
    }
    console.error(`[telegram] send failed: ${result.description}`);
  }
}

// 全站密碼閘門。密碼存在 Cloudflare Pages 的加密變數 SITE_PASSWORD，不在程式碼裡。
// 通過後發一個 cookie（密碼的 HMAC，不是密碼本身），14 天內免重輸。
const COOKIE = "hl_gate";
const MAX_AGE = 60 * 60 * 24 * 14;

const enc = new TextEncoder();

async function sign(password) {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode("school-stats-gate-v1"));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// 固定時間比對，避免從回應時間猜密碼
function same(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

function readCookie(req, name) {
  const m = (req.headers.get("Cookie") || "").match(new RegExp("(?:^|;\\s*)" + name + "=([^;]*)"));
  return m ? m[1] : "";
}

function page(error) {
  const html = `<!DOCTYPE html>
<html lang="zh-Hant-TW"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex,nofollow">
<title>請輸入密碼｜鴻綸科技</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;700&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f4f6fb;font-family:"Noto Sans TC",sans-serif;color:#1f2937}
form{width:min(92vw,360px);background:#fff;border-radius:16px;padding:32px 28px;box-shadow:0 8px 30px rgba(0,0,0,.08)}
h1{margin:0 0 6px;font-size:1.25rem}
p{margin:0 0 20px;color:#6b7280;font-size:.9rem}
input{width:100%;padding:12px 14px;font:inherit;border:1.5px solid #d1d5db;border-radius:10px}
input:focus{outline:none;border-color:#2563eb}
button{margin-top:14px;width:100%;padding:12px;font:inherit;font-weight:700;color:#fff;background:#2563eb;border:0;border-radius:10px;cursor:pointer}
.err{margin-top:12px;color:#dc2626;font-size:.9rem}
</style></head><body>
<form method="POST" autocomplete="off">
<h1>全國學校人數查詢</h1>
<p>這個頁面需要密碼才能進入。</p>
<input type="password" name="password" placeholder="請輸入密碼" autofocus required>
<button type="submit">進入</button>
${error ? '<div class="err">密碼不正確，請再試一次。</div>' : ""}
</form></body></html>`;
  return new Response(html, {
    status: error ? 401 : 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" },
  });
}

export async function onRequest(context) {
  const { request, env, next } = context;
  const password = env.SITE_PASSWORD;
  // 沒設密碼時寧可整站打不開，也不要變成沒鎖
  if (!password) return new Response("Site locked: password not configured.", { status: 503 });

  const token = await sign(password);
  if (same(readCookie(request, COOKIE), token)) {
    const res = await next();
    const out = new Response(res.body, res);
    out.headers.set("Cache-Control", "private, no-store");
    out.headers.set("X-Robots-Tag", "noindex, nofollow");
    return out;
  }

  if (request.method === "POST") {
    const form = await request.formData().catch(() => null);
    const given = form ? String(form.get("password") || "") : "";
    if (same(await sign(given), token)) {
      const url = new URL(request.url);
      return new Response(null, {
        status: 303,
        headers: {
          Location: url.pathname + url.search,
          "Set-Cookie": `${COOKIE}=${token}; Path=/; Max-Age=${MAX_AGE}; HttpOnly; Secure; SameSite=Lax`,
          "Cache-Control": "no-store",
        },
      });
    }
    await new Promise((r) => setTimeout(r, 800));
    return page(true);
  }
  return page(false);
}

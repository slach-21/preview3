/* ============================================================
   Mekan CRM — общая логика (Cloudflare Pages Functions + D1).
   Настройки услуг/часов здесь; секреты — в переменных окружения:
   ADMIN_PASSWORD, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID,
   RESEND_API_KEY (опц.), OWNER_EMAIL (опц.), SITE_URL.
   ============================================================ */

export const SERVICES = {
  haircut:       { name: 'Haircut',         price: 30, duration: 45 },
  beard:         { name: 'Beard trim',      price: 25, duration: 30 },
  haircut_beard: { name: 'Haircut + beard', price: 50, duration: 75 },
  kids:          { name: "Kids' haircut",   price: 25, duration: 30 },
  father_son:    { name: 'Father + son',    price: 50, duration: 75 },
  two_friends:   { name: 'Two friends',     price: 55, duration: 90 },
};

/* график: 0=вс … 6=сб; минуты от полуночи; null = выходной */
export const HOURS = { 1:[600,1200], 2:[600,1200], 3:[600,1200], 4:[600,1200], 5:[600,1200], 6:[600,1080], 0:null };

export const BUFFER_MIN = 40;     // резерв после каждой записи (дорога/обед)
export const SLOT_STEP = 30;
export const LEAD_TIME_MIN = 90;
export const MAX_DAYS_AHEAD = 60;
export const TZ = 'Europe/Tallinn';
export const PHONE = '+372 5308 2235';
export const WHATSAPP = '37253082235';

export const fmtTime = m => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
export const parseTime = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export const json = (o, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });

export const html = (s, status = 200) =>
  new Response(s, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Robots-Tag': 'noindex' } });

/* «сейчас» в таллинском времени */
export function nowTallinn() {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false, weekday: 'short',
  }).formatToParts(new Date()).map(x => [x.type, x.value]));
  return {
    date: `${p.year}-${p.month}-${p.day}`,
    minutes: Number(p.hour) * 60 + Number(p.minute),
  };
}

export const weekday = dateStr => new Date(dateStr + 'T12:00:00Z').getUTCDay();

export function dateShift(dateStr, days) {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export const prettyDate = ds =>
  new Date(ds + 'T12:00:00Z').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });

/* ---------- слоты ---------- */
export async function freeSlots(env, date, duration) {
  const now = nowTallinn();
  if (date < now.date || date > dateShift(now.date, MAX_DAYS_AHEAD)) return [];
  const h = HOURS[weekday(date)];
  if (!h) return [];
  const [open, close] = h;

  const { results } = await env.DB.prepare(
    "SELECT start_min, end_min, buffer_min FROM bookings WHERE date=?1 AND status IN ('confirmed','done','block')"
  ).bind(date).all();
  const busy = results.map(b => [b.start_min, b.end_min + b.buffer_min]);

  let minStart = open;
  if (date === now.date) {
    minStart = Math.max(minStart, Math.ceil((now.minutes + LEAD_TIME_MIN) / SLOT_STEP) * SLOT_STEP);
  }
  const out = [];
  for (let s = minStart; s + duration <= close; s += SLOT_STEP) {
    const e = s + duration + BUFFER_MIN;
    if (!busy.some(([bs, be]) => s < be && bs < e)) out.push(s);
  }
  return out;
}

/* ---------- rate limit (D1) ---------- */
export async function rateOk(env, key, max, windowSec) {
  const now = Math.floor(Date.now() / 1000);
  const row = await env.DB.prepare('SELECT hits FROM rate WHERE k=?1').bind(key).first();
  const hits = (row ? JSON.parse(row.hits) : []).filter(t => t > now - windowSec);
  if (hits.length >= max) return false;
  hits.push(now);
  await env.DB.prepare('INSERT INTO rate(k,hits) VALUES(?1,?2) ON CONFLICT(k) DO UPDATE SET hits=excluded.hits')
    .bind(key, JSON.stringify(hits)).run();
  return true;
}

export const newRef = () => {
  const d = new Date();
  const ymd = String(d.getUTCFullYear()).slice(2) + String(d.getUTCMonth() + 1).padStart(2, '0') + String(d.getUTCDate()).padStart(2, '0');
  return 'MEK-' + ymd + '-' + [...crypto.getRandomValues(new Uint8Array(2))].map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
};
export const newToken = () => [...crypto.getRandomValues(new Uint8Array(16))].map(b => b.toString(16).padStart(2, '0')).join('');

/* ---------- HMAC (cookie админки / CSRF) ---------- */
async function hmac(env, msg) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode('mekan|' + (env.ADMIN_PASSWORD || 'dev')),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(msg));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
}
export async function makeSession(env) {
  const exp = Date.now() + 12 * 3600 * 1000;
  return exp + '.' + await hmac(env, 'sess' + exp);
}
export async function checkSession(env, cookieHeader) {
  const m = /adm=([0-9]+)\.([a-f0-9]+)/.exec(cookieHeader || '');
  if (!m || Number(m[1]) < Date.now()) return false;
  return (await hmac(env, 'sess' + m[1])) === m[2];
}
export const csrfToken = (env) => hmac(env, 'csrf-day-' + new Date().toISOString().slice(0, 10));

/* ---------- уведомления ---------- */
export async function tgSend(env, text) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return;
  try {
    await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text, parse_mode: 'HTML', disable_web_page_preview: true }),
    });
  } catch {}
}

export async function emailSend(env, to, subject, htmlBody) {
  if (!env.RESEND_API_KEY) return false;
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + env.RESEND_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: env.EMAIL_FROM || 'Barber Mekan Tan <onboarding@resend.dev>',
        to: [to], subject, html: htmlBody,
      }),
    });
    return r.ok;
  } catch { return false; }
}

export function emailWrap(tag, body) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EFE8D8;font-family:Arial,Helvetica,sans-serif"><tr><td align="center" style="padding:26px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" align="center" style="width:100%;max-width:600px;margin:0 auto">
<tr><td style="background:#131008;padding:18px 26px"><span style="font:700 17px Georgia,serif;color:#C9A35C;letter-spacing:.08em">MEKAN&nbsp;TAN</span><span style="float:right;font:700 10px Arial;color:#A89C82;letter-spacing:.2em;padding-top:5px">${tag}</span></td></tr>
<tr><td style="background:#fff;border:1px solid #d8d0bd;border-top:0;padding:26px 28px;color:#181309;font-size:15px;line-height:1.6">${body}</td></tr>
<tr><td style="padding:14px 0 0;text-align:center;color:#A89C82;font-size:12px">Barber Mekan Tan · Mobile barber · ${PHONE}</td></tr>
</table></td></tr></table>`;
}

export async function notifyNewBooking(env, b, siteUrl) {
  const when = prettyDate(b.date) + ' ' + fmtTime(b.start_min);
  const maps = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(b.address + ', Estonia');
  await tgSend(env, `💈 <b>Новая запись</b>\n${b.service_name} — ${b.price}€\n🗓 ${when}\n👤 ${b.name} · ${b.phone}\n📍 ${b.address}\n<a href="${maps}">Карта</a> · ${b.ref}`);
  if (env.OWNER_EMAIL) {
    await emailSend(env, env.OWNER_EMAIL, `Новая запись — ${b.name} · ${when}`,
      emailWrap('NEW BOOKING', `<p><b>${esc(b.service_name)}</b> — ${b.price}€<br>${when}<br>${esc(b.name)} · ${esc(b.phone)}<br>${esc(b.address)}<br>${b.ref}</p><p><a href="${maps}" style="color:#8F6B2C">Адрес на карте</a></p>`));
  }
  if (b.email) {
    const manage = siteUrl + '/manage?t=' + b.token;
    await emailSend(env, b.email, `Booking confirmed · ${when} · ${b.ref}`,
      emailWrap('CONFIRMED', `<h2 style="margin:0 0 10px;font-family:Georgia,serif">Your booking is confirmed</h2>
<p style="margin:0 0 16px">Hi ${esc(b.name)}, see you soon! The details:</p>
<div style="border:1px solid #e5decb;padding:16px 18px;margin:0 0 18px"><b>${esc(b.service_name)}</b> — ${b.price}€<br>${when}<br>${esc(b.address)}</div>
<p style="margin:0 0 6px;font-size:13px;color:#5E5645">Change or cancel:</p>
<p style="margin:0 0 16px"><a href="${manage}" style="color:#8F6B2C">${manage}</a></p>
<p style="margin:0;font-size:13px;color:#5E5645">Questions? WhatsApp ${PHONE}</p>`));
  }
}

export async function notifyCancelled(env, b, by) {
  const when = prettyDate(b.date) + ' ' + fmtTime(b.start_min);
  await tgSend(env, `❌ <b>Отмена</b> (${by})\n${b.service_name} · ${when}\n👤 ${b.name} · ${b.phone} · ${b.ref}`);
}

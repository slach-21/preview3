import { fmtTime, esc, html, notifyCancelled, PHONE, WHATSAPP } from './api/_lib.js';

const CSS = `:root{--paper:#EFE8D8;--ink:#181309;--ink2:#5E5645;--dark:#131008;--bone:#F0E9DA;--brass:#8F6B2C;--brass-b:#C9A35C}
*{margin:0;padding:0;box-sizing:border-box}
body{background:var(--paper);color:var(--ink);font-family:Archivo,-apple-system,Arial,sans-serif;min-height:100vh;display:flex;flex-direction:column}
header{background:var(--dark);color:var(--bone);padding:16px 22px;display:flex;align-items:center;gap:10px}
.mono{font-family:Georgia,serif;font-style:italic;color:var(--brass-b);border:1.5px solid var(--brass-b);width:30px;height:30px;display:grid;place-items:center}
header b{letter-spacing:.12em;font-size:14px}
main{flex:1;max-width:560px;width:100%;margin:0 auto;padding:34px 22px}
h1{font-family:Georgia,serif;font-weight:600;font-size:28px;margin-bottom:18px}
.card{border:2px solid var(--ink);background:#F7F2E6;padding:22px}
.row{padding:10px 0;border-bottom:1px solid rgba(24,19,9,.15);font-size:15px}
.row b{display:block;font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--ink2);margin-bottom:2px}
.st{display:inline-block;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;padding:4px 10px;margin-bottom:14px}
.st.ok{background:#DFE8D9;color:#3E5E34}.st.no{background:#EBD9D5;color:#7A3B2E}
.btn{display:inline-block;margin-top:18px;border:2px solid var(--ink);background:none;color:var(--ink);font:700 13px Archivo;letter-spacing:.06em;text-transform:uppercase;padding:13px 22px;cursor:pointer;text-decoration:none}
.btn:hover{background:var(--ink);color:var(--paper)}
.note{margin-top:16px;font-size:13px;color:var(--ink2)}
.ok-msg{background:#DFE8D9;color:#3E5E34;padding:12px 16px;margin-bottom:16px;font-size:14px}
a.gold{color:var(--brass)}`;

function page(inner) {
  return html(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>Your booking — Barber Mekan Tan</title><style>${CSS}</style></head>
<body><header><span class="mono">M</span><b>MEKAN TAN</b></header><main>${inner}</main></body></html>`);
}

async function getBooking(env, request) {
  const t = (new URL(request.url).searchParams.get('t') || '').replace(/[^a-f0-9]/g, '');
  if (!t) return null;
  return env.DB.prepare('SELECT * FROM bookings WHERE token=?1 AND token!=""').bind(t).first();
}

function render(b, msg, origin) {
  if (!b) return page(`<h1>Booking not found</h1>
    <p style="color:var(--ink2)">The link is invalid or expired. Questions? WhatsApp <a class="gold" href="https://wa.me/${WHATSAPP}">${PHONE}</a></p>`);
  const when = new Date(b.date + 'T12:00:00Z').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  const confirmed = b.status === 'confirmed';
  return page(`<h1>Your booking</h1>
    ${msg ? `<div class="ok-msg">${esc(msg)}</div>` : ''}
    <div class="card">
      <span class="st ${confirmed ? 'ok' : 'no'}">${confirmed ? 'Confirmed' : 'Cancelled'}</span>
      <div class="row"><b>Service</b>${esc(b.service_name)} — ${b.price}€</div>
      <div class="row"><b>When</b>${when} · ${fmtTime(b.start_min)}</div>
      <div class="row"><b>Address</b>${esc(b.address)}</div>
      <div class="row" style="border:0"><b>Ref</b>${esc(b.ref)}</div>
    </div>
    ${confirmed
      ? `<form method="post" onsubmit="return confirm('Cancel this booking?')">
           <button class="btn" name="cancel" value="1" type="submit">Cancel booking</button></form>
         <p class="note">Need a different time? Cancel and book again at <a class="gold" href="${origin}/#book">${new URL(origin).host}</a>, or WhatsApp <a class="gold" href="https://wa.me/${WHATSAPP}">${PHONE}</a>.</p>`
      : `<a class="btn" href="${origin}/#book">Book a new visit</a>`}`);
}

export async function onRequestGet({ request, env }) {
  if (!env.DB) return page('<h1>Temporarily unavailable</h1>');
  const b = await getBooking(env, request);
  return render(b, '', new URL(request.url).origin);
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return page('<h1>Temporarily unavailable</h1>');
  const b = await getBooking(env, request);
  let msg = '';
  if (b && b.status === 'confirmed') {
    const form = await request.formData();
    if (form.get('cancel')) {
      await env.DB.prepare("UPDATE bookings SET status='cancelled' WHERE id=?1").bind(b.id).run();
      b.status = 'cancelled';
      await notifyCancelled(env, b, 'клиент');
      msg = 'Your booking has been cancelled.';
    }
  }
  return render(b, msg, new URL(request.url).origin);
}

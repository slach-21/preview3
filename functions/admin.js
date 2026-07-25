import {
  SERVICES, BUFFER_MIN, freeSlots, parseTime, fmtTime, dateShift, weekday, nowTallinn,
  esc, html, newRef, newToken, rateOk, makeSession, checkSession, csrfToken, notifyCancelled,
} from './api/_lib.js';

const CSS = `:root{--paper:#EFE8D8;--paper2:#F7F2E6;--ink:#181309;--ink2:#5E5645;--dark:#131008;--bone:#F0E9DA;--bone2:#A89C82;--brass:#8F6B2C;--brass-b:#C9A35C;--ok:#3E5E34;--bad:#7A3B2E}
*{margin:0;padding:0;box-sizing:border-box}
body{background:var(--paper);color:var(--ink);font-family:Archivo,-apple-system,Arial,sans-serif;font-size:15px;min-height:100vh}
a{color:inherit}
header{background:var(--dark);color:var(--bone);position:sticky;top:0;z-index:10}
.hbar{display:flex;align-items:center;gap:12px;padding:12px 18px;max-width:1080px;margin:0 auto}
.mono{font-family:Georgia,serif;font-style:italic;color:var(--brass-b);border:1.5px solid var(--brass-b);width:30px;height:30px;display:grid;place-items:center;flex:none}
.hbar b{letter-spacing:.1em;font-size:14px}.hbar .sp{flex:1}
nav.tabs{display:flex;gap:2px;max-width:1080px;margin:0 auto;padding:0 18px 10px;flex-wrap:wrap}
nav.tabs a{font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--bone2);padding:8px 13px;text-decoration:none;border:1px solid rgba(240,233,218,.2)}
nav.tabs a.on{background:var(--brass-b);color:var(--dark);border-color:var(--brass-b)}
main{max-width:1080px;margin:0 auto;padding:22px 18px 80px}
h1{font-family:Georgia,serif;font-weight:600;font-size:24px;margin-bottom:4px}
.sub{color:var(--ink2);font-size:13px;margin-bottom:18px}
.flash{background:#DFE8D9;color:var(--ok);padding:11px 16px;margin-bottom:18px;font-size:14px;border:1px solid #c6d4bd}
.datenav{display:flex;gap:8px;align-items:center;margin-bottom:20px;flex-wrap:wrap}
.datenav a{border:1.5px solid var(--ink);padding:8px 14px;font-size:13px;font-weight:700;text-decoration:none}
.datenav a:hover{background:var(--ink);color:var(--paper)}
.datenav .cur{font-family:Georgia,serif;font-style:italic;font-size:17px;padding:0 8px}
.card{background:var(--paper2);border:1px solid rgba(24,19,9,.3);margin-bottom:12px;display:flex;overflow:hidden}
.card .t{flex:none;width:86px;background:var(--dark);color:var(--bone);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:12px 6px}
.card .t b{font-size:17px}.card .t span{font-size:10px;color:var(--bone2)}
.card .t i{font-style:normal;font-size:9.5px;color:var(--brass-b);margin-top:5px}
.card .b{flex:1;padding:12px 16px;min-width:0}
.card .b h3{font-size:15.5px;margin-bottom:2px}
.card .b .cl{font-size:13.5px;color:var(--ink2)}
.card .b .cl a{color:var(--brass);font-weight:600;text-decoration:none}
.card .acts{flex:none;display:flex;flex-direction:column;gap:6px;padding:12px;justify-content:center}
.abtn{border:1.5px solid var(--ink);background:none;font:700 10.5px Archivo;letter-spacing:.06em;text-transform:uppercase;padding:7px 10px;cursor:pointer}
.abtn:hover{background:var(--ink);color:var(--paper)}
.abtn.warn{border-color:var(--bad);color:var(--bad)}.abtn.warn:hover{background:var(--bad);color:#fff}
.card.block{opacity:.85}
.card.block .t{background:repeating-linear-gradient(45deg,#2a251c,#2a251c 6px,#1d1912 6px,#1d1912 12px)}
.card.done{opacity:.6}
.tag{display:inline-block;font-size:9.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:2px 7px;margin-left:6px;vertical-align:2px}
.tag.done{background:#DFE8D9;color:var(--ok)}.tag.adm{background:#E8E0CC;color:var(--brass)}
.empty{border:2px dashed rgba(24,19,9,.3);padding:34px;text-align:center;color:var(--ink2);font-style:italic;font-family:Georgia,serif}
.grid2{display:grid;gap:22px}@media(min-width:860px){.grid2{grid-template-columns:1fr 1fr}}
form.panel{background:var(--paper2);border:2px solid var(--ink);padding:20px}
form.panel h2{font-family:Georgia,serif;font-size:19px;margin-bottom:14px}
form.panel label{display:block;font-size:10.5px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--ink2);margin:12px 0 4px}
form.panel input,form.panel select{width:100%;padding:11px;border:1px solid rgba(24,19,9,.4);background:#fff;font:500 14px Archivo;color:var(--ink)}
form.panel .row2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.sbtn{margin-top:16px;width:100%;background:var(--dark);color:var(--bone);border:0;font:700 13px Archivo;letter-spacing:.08em;text-transform:uppercase;padding:14px;cursor:pointer}
.sbtn:hover{background:var(--brass)}
table.cl{width:100%;border-collapse:collapse;font-size:14px}
table.cl th{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink2);text-align:left;padding:8px;border-bottom:2px solid var(--ink)}
table.cl td{padding:10px 8px;border-bottom:1px solid rgba(24,19,9,.15);vertical-align:top}
table.cl td a{color:var(--brass);text-decoration:none;font-weight:600}
.wk{display:grid;gap:10px}@media(min-width:900px){.wk{grid-template-columns:repeat(7,1fr)}}
.wd{background:var(--paper2);border:1px solid rgba(24,19,9,.3);padding:10px;min-height:90px}
.wd h4{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink2);margin-bottom:8px}
.wd h4 a{text-decoration:none}
.wd .it{font-size:12px;padding:5px 7px;background:var(--dark);color:var(--bone);margin-bottom:5px}
.wd .it.blk{background:repeating-linear-gradient(45deg,#2a251c,#2a251c 6px,#1d1912 6px,#1d1912 12px)}
.wd.today{outline:2px solid var(--brass-b)}
.login{max-width:340px;margin:12vh auto;padding:0 20px}
.login h1{margin-bottom:16px}
.login input{width:100%;padding:13px;border:2px solid var(--ink);background:#fff;font-size:15px}
.stat{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:22px}
.stat div{background:var(--paper2);border:1px solid rgba(24,19,9,.3);padding:12px;text-align:center}
.stat b{font-family:Georgia,serif;font-size:22px;display:block}
.stat span{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink2)}`;

const page = body => html(`<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow">
<title>Mekan CRM</title><style>${CSS}</style></head><body>${body}</body></html>`);

const hidden = (csrf, extra = {}) =>
  `<input type="hidden" name="csrf" value="${csrf}">` +
  Object.entries(extra).map(([k, v]) => `<input type="hidden" name="${k}" value="${esc(v)}">`).join('');

const prettyDay = ds => new Date(ds + 'T12:00:00Z').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
const dm = ds => ds.slice(8, 10) + '.' + ds.slice(5, 7);

async function dayRows(env, date) {
  const { results } = await env.DB.prepare(
    "SELECT * FROM bookings WHERE date=?1 AND status!='cancelled' ORDER BY start_min").bind(date).all();
  return results;
}

/* ================= VIEWS ================= */

function shell(view, inner, flash) {
  const tab = (v, label, extra = '') =>
    `<a href="/admin?v=${v}${extra}" class="${view === v ? 'on' : ''}">${label}</a>`;
  return `<header><div class="hbar"><span class="mono">M</span><b>MEKAN CRM</b><span class="sp"></span>
    <a href="/admin?logout=1" style="font-size:12px;color:var(--bone2)">Выйти</a></div>
    <nav class="tabs">${tab('day', 'Сегодня')}${tab('week', 'Неделя')}${tab('add', '+ Запись / блок')}${tab('clients', 'Клиенты')}</nav></header>
    <main>${flash ? `<div class="flash">${esc(flash)}</div>` : ''}${inner}</main>`;
}

async function viewDay(env, d, csrf) {
  const rows = await dayRows(env, d);
  const { results: cancelled } = await env.DB.prepare(
    "SELECT * FROM bookings WHERE date=?1 AND status='cancelled' ORDER BY start_min").bind(d).all();
  const visits = rows.filter(r => r.source !== 'block');
  const rev = visits.reduce((s, r) => s + r.price, 0);
  const today = nowTallinn().date;

  const card = r => {
    const isBlock = r.source === 'block';
    const maps = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(r.address + ', Estonia');
    return `<div class="card ${isBlock ? 'block' : ''} ${r.status === 'done' ? 'done' : ''}">
      <div class="t"><b>${fmtTime(r.start_min)}</b><span>до ${fmtTime(r.end_min)}</span>${isBlock ? '' : `<i>+${r.buffer_min}м буфер</i>`}</div>
      <div class="b">${isBlock
        ? `<h3>⛔ ${esc(r.service_name)}</h3><div class="cl">Время закрыто для записи</div>`
        : `<h3>${esc(r.service_name)} · ${r.price}€
             ${r.status === 'done' ? '<span class="tag done">выполнено</span>' : ''}
             ${r.source === 'admin' ? '<span class="tag adm">вручную</span>' : ''}</h3>
           <div class="cl">${esc(r.name)} · <a href="tel:${esc(r.phone)}">${esc(r.phone)}</a> ·
             <a href="https://wa.me/${r.phone.replace(/\D/g, '')}" target="_blank">WhatsApp</a></div>
           <div class="cl">📍 <a href="${maps}" target="_blank">${esc(r.address)}</a></div>
           ${r.note ? `<div class="cl">✎ ${esc(r.note)}</div>` : ''}`}</div>
      <div class="acts">${isBlock
        ? `<form method="post">${hidden(csrf, { action: 'delete_block', id: r.id, back: 'day', backd: d })}<button class="abtn warn">Снять</button></form>`
        : `${r.status === 'confirmed' ? `<form method="post">${hidden(csrf, { action: 'done', id: r.id, back: 'day', backd: d })}<button class="abtn">✓ Готово</button></form>` : ''}
           <form method="post" onsubmit="return confirm('Отменить запись?')">${hidden(csrf, { action: 'cancel', id: r.id, back: 'day', backd: d })}<button class="abtn warn">Отмена</button></form>`}</div>
    </div>`;
  };

  return `<h1>${prettyDay(d)}</h1>
    <p class="sub">${d === today ? 'Сегодня' : d} · после каждой записи заложен буфер ${BUFFER_MIN} мин</p>
    <div class="datenav">
      <a href="/admin?v=day&d=${dateShift(d, -1)}">←</a><span class="cur">${dm(d)}</span>
      <a href="/admin?v=day&d=${dateShift(d, 1)}">→</a><a href="/admin?v=day&d=${today}">Сегодня</a></div>
    <div class="stat">
      <div><b>${visits.length}</b><span>визитов</span></div>
      <div><b>${rev}€</b><span>выручка дня</span></div>
      <div><b>${cancelled.length}</b><span>отмен</span></div></div>
    ${rows.length ? rows.map(card).join('') : '<div class="empty">Свободный день — ни одной записи</div>'}
    ${cancelled.length ? `<p class="sub" style="margin-top:20px">Отменённые:</p>` + cancelled.map(r =>
      `<div class="card" style="opacity:.5"><div class="t"><b>${fmtTime(r.start_min)}</b></div>
        <div class="b"><h3>${esc(r.service_name)}</h3><div class="cl">${esc(r.name)} · ${esc(r.phone)}</div></div>
        <div class="acts"><form method="post">${hidden(csrf, { action: 'restore', id: r.id, back: 'day', backd: d })}<button class="abtn">Вернуть</button></form></div></div>`).join('') : ''}`;
}

async function viewWeek(env, d) {
  const dow = (weekday(d) + 6) % 7;                    // 0=пн
  const monday = dateShift(d, -dow);
  const today = nowTallinn().date;
  let cols = '';
  for (let i = 0; i < 7; i++) {
    const dd = dateShift(monday, i);
    const rr = await dayRows(env, dd);
    cols += `<div class="wd ${dd === today ? 'today' : ''}">
      <h4><a href="/admin?v=day&d=${dd}">${new Date(dd + 'T12:00:00Z').toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' })} ${Number(dd.slice(8))}.${Number(dd.slice(5, 7))}</a></h4>
      ${rr.length ? rr.map(r => `<div class="it ${r.source === 'block' ? 'blk' : ''}">${fmtTime(r.start_min)} ${r.source === 'block' ? '⛔' : esc((r.name || r.service_name).slice(0, 14))}</div>`).join('') : '<div style="font-size:11px;color:var(--bone2)">—</div>'}</div>`;
  }
  return `<h1>Неделя</h1>
    <div class="datenav"><a href="/admin?v=week&d=${dateShift(monday, -7)}">←</a>
      <span class="cur">${dm(monday)} — ${dm(dateShift(monday, 6))}</span>
      <a href="/admin?v=week&d=${dateShift(monday, 7)}">→</a>
      <a href="/admin?v=week&d=${today}">Тек. неделя</a></div>
    <div class="wk">${cols}</div>`;
}

function viewAdd(d, csrf) {
  const opts = Object.entries(SERVICES).map(([id, s]) =>
    `<option value="${id}">${esc(s.name)} — ${s.price}€ · ${s.duration} мин</option>`).join('');
  return `<h1>Добавить</h1>
    <p class="sub">Ручная запись или блокировка времени. Буфер ${BUFFER_MIN} мин учитывается автоматически.</p>
    <div class="grid2">
      <form class="panel" method="post"><h2>Новая запись</h2>
        ${hidden(csrf, { action: 'add_booking', back: 'day', backd: d })}
        <label>Услуга</label><select name="service">${opts}</select>
        <div class="row2">
          <div><label>Дата</label><input type="date" name="date" value="${d}"></div>
          <div><label>Время (HH:MM)</label><input type="text" name="time" placeholder="14:30" inputmode="numeric"></div></div>
        <div class="row2">
          <div><label>Имя</label><input type="text" name="name"></div>
          <div><label>Телефон</label><input type="text" name="phone" placeholder="+372 …"></div></div>
        <label>Адрес</label><input type="text" name="address" placeholder="Heki 34, Haabneeme">
        <label>Заметка</label><input type="text" name="note" placeholder="под двойку, домофон 34">
        <button class="sbtn">Добавить запись</button></form>
      <form class="panel" method="post"><h2>Заблокировать время</h2>
        ${hidden(csrf, { action: 'add_block', back: 'day', backd: d })}
        <label>Дата</label><input type="date" name="date" value="${d}">
        <div class="row2">
          <div><label>С</label><input type="text" name="from" placeholder="13:00" inputmode="numeric"></div>
          <div><label>До</label><input type="text" name="to" placeholder="15:00" inputmode="numeric"></div></div>
        <label>Причина (видите только вы)</label><input type="text" name="note" placeholder="Обед / личное / дорога">
        <button class="sbtn">Заблокировать</button></form></div>`;
}

async function viewClients(env, d, csrf) {
  const { results: clients } = await env.DB.prepare(
    `SELECT phone, MAX(name) name, COUNT(*) visits, SUM(price) total, MAX(date) last
     FROM bookings WHERE source!='block' AND status IN ('confirmed','done') AND phone!=''
     GROUP BY phone ORDER BY last DESC`).all();
  const { results: noteRows } = await env.DB.prepare('SELECT phone, note FROM client_notes').all();
  const notes = Object.fromEntries(noteRows.map(n => [n.phone, n.note]));
  return `<h1>Клиенты (${clients.length})</h1>
    <p class="sub">Группировка по номеру телефона. Заметка сохраняется по кнопке ✓.</p>
    <table class="cl"><tr><th>Клиент</th><th>Визиты</th><th>Сумма</th><th>Последний</th><th>Заметка</th></tr>
    ${clients.map(c => `<tr>
      <td><b>${esc(c.name || '—')}</b><br><a href="tel:${esc(c.phone)}">${esc(c.phone)}</a> ·
        <a href="https://wa.me/${c.phone.replace(/\D/g, '')}" target="_blank">WA</a></td>
      <td>${c.visits}</td><td>${c.total}€</td><td>${esc(c.last)}</td>
      <td><form method="post" style="display:flex;gap:6px">
        ${hidden(csrf, { action: 'client_note', back: 'clients', backd: d, phone: c.phone })}
        <input type="text" name="note" value="${esc(notes[c.phone] || '')}" style="padding:7px;border:1px solid rgba(24,19,9,.35);font:400 13px Archivo;width:100%">
        <button class="abtn">✓</button></form></td></tr>`).join('')}
    </table>
    ${clients.length ? '' : '<div class="empty" style="margin-top:14px">Пока нет клиентов</div>'}`;
}

/* ================= HANDLERS ================= */

const loginPage = err => page(`<div class="login"><h1>Mekan CRM</h1>
  ${err ? `<p style="color:var(--bad);margin-bottom:10px">${esc(err)}</p>` : ''}
  <form method="post"><input type="password" name="pw" placeholder="Пароль" autofocus>
  <button class="sbtn">Войти</button></form></div>`);

export async function onRequestGet({ request, env }) {
  if (!env.DB) return page('<div class="login"><h1>Mekan CRM</h1><p>База D1 не привязана — см. README.</p></div>');
  const url = new URL(request.url);
  if (url.searchParams.get('logout')) {
    return new Response(null, { status: 302, headers: { Location: '/admin', 'Set-Cookie': 'adm=; Path=/; Max-Age=0' } });
  }
  if (!(await checkSession(env, request.headers.get('Cookie')))) return loginPage('');

  const view = url.searchParams.get('v') || 'day';
  const dRaw = url.searchParams.get('d') || '';
  const d = /^\d{4}-\d{2}-\d{2}$/.test(dRaw) ? dRaw : nowTallinn().date;
  const flash = url.searchParams.get('m') || '';
  const csrf = await csrfToken(env);

  let inner;
  if (view === 'week') inner = await viewWeek(env, d);
  else if (view === 'add') inner = viewAdd(d, csrf);
  else if (view === 'clients') inner = await viewClients(env, d, csrf);
  else inner = await viewDay(env, d, csrf);
  return page(shell(view, inner, flash));
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return loginPage('База D1 не привязана');
  const form = await request.formData();
  const f = k => String(form.get(k) ?? '').trim();

  /* логин */
  if (form.has('pw')) {
    const ip = request.headers.get('CF-Connecting-IP') || '0';
    if (!(await rateOk(env, 'admlogin:' + ip, 10, 600))) return loginPage('Слишком много попыток — подождите');
    if (!env.ADMIN_PASSWORD || f('pw') !== env.ADMIN_PASSWORD) return loginPage('Неверный пароль');
    return new Response(null, { status: 302, headers: {
      Location: '/admin',
      'Set-Cookie': `adm=${await makeSession(env)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=43200`,
    } });
  }

  if (!(await checkSession(env, request.headers.get('Cookie')))) return loginPage('');
  if (f('csrf') !== await csrfToken(env)) return page('<main><h1>Bad CSRF — обновите страницу</h1></main>');

  const a = f('action');
  let flash = '';
  const back = f('back') || 'day';
  const backd = /^\d{4}-\d{2}-\d{2}$/.test(f('backd')) ? f('backd') : nowTallinn().date;

  if (a === 'cancel' || a === 'done' || a === 'restore') {
    const id = Number(f('id'));
    const b = await env.DB.prepare('SELECT * FROM bookings WHERE id=?1').bind(id).first();
    if (b) {
      const st = a === 'cancel' ? 'cancelled' : a === 'done' ? 'done' : 'confirmed';
      await env.DB.prepare('UPDATE bookings SET status=?1 WHERE id=?2').bind(st, id).run();
      if (a === 'cancel' && b.source !== 'block') await notifyCancelled(env, b, 'админ');
      flash = a === 'cancel' ? 'Запись отменена' : a === 'done' ? 'Отмечено выполненным' : 'Восстановлено';
    }
  }

  if (a === 'delete_block') {
    await env.DB.prepare("DELETE FROM bookings WHERE id=?1 AND source='block'").bind(Number(f('id'))).run();
    flash = 'Блокировка снята';
  }

  if (a === 'add_booking') {
    const svc = SERVICES[f('service')];
    const date = f('date'), time = f('time');
    if (svc && /^\d{4}-\d{2}-\d{2}$/.test(date) && /^\d{1,2}:\d{2}$/.test(time)) {
      const start = parseTime(time), end = start + svc.duration;
      const slots = await freeSlots(env, date, svc.duration);
      if (slots.includes(start)) {
        await env.DB.prepare(`INSERT INTO bookings (ref,status,service_id,service_name,price,date,start_min,end_min,buffer_min,name,phone,email,address,note,token,source,created_at)
          VALUES (?1,'confirmed',?2,?3,?4,?5,?6,?7,?8,?9,?10,'',?11,?12,?13,'admin',?14)`)
          .bind(newRef(), f('service'), svc.name, svc.price, date, start, end, BUFFER_MIN,
            f('name').slice(0, 120), f('phone').replace(/[^\d+ ]/g, '').slice(0, 30),
            f('address').slice(0, 250), f('note').slice(0, 500), newToken(), new Date().toISOString()).run();
        flash = 'Запись добавлена';
      } else flash = '⚠ Этот слот занят (учтён буфер ' + BUFFER_MIN + ' мин) — выберите другое время';
    } else flash = '⚠ Заполните услугу, дату и время';
  }

  if (a === 'add_block') {
    const date = f('date'), from = f('from'), to = f('to');
    if (/^\d{4}-\d{2}-\d{2}$/.test(date) && /^\d{1,2}:\d{2}$/.test(from) && /^\d{1,2}:\d{2}$/.test(to) && parseTime(to) > parseTime(from)) {
      await env.DB.prepare(`INSERT INTO bookings (ref,status,service_id,service_name,price,date,start_min,end_min,buffer_min,name,phone,email,address,note,token,source,created_at)
        VALUES (?1,'block','',?2,0,?3,?4,?5,0,'','','','','','','block',?6)`)
        .bind(newRef(), (f('note') || 'Занято').slice(0, 120), date, parseTime(from), parseTime(to), new Date().toISOString()).run();
      flash = 'Время заблокировано';
    } else flash = '⚠ Проверьте дату и время блокировки';
  }

  if (a === 'client_note') {
    await env.DB.prepare('INSERT INTO client_notes(phone,note) VALUES(?1,?2) ON CONFLICT(phone) DO UPDATE SET note=excluded.note')
      .bind(f('phone').slice(0, 30), f('note').slice(0, 500)).run();
    flash = 'Заметка сохранена';
  }

  return new Response(null, { status: 302, headers: {
    Location: `/admin?v=${encodeURIComponent(back)}&d=${encodeURIComponent(backd)}&m=${encodeURIComponent(flash)}`,
  } });
}

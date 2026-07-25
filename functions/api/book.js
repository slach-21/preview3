import {
  SERVICES, BUFFER_MIN, freeSlots, parseTime, prettyDate,
  json, rateOk, newRef, newToken, notifyNewBooking,
} from './_lib.js';

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ success: false, message: 'Booking is being set up — please WhatsApp us for now.' }, 503);

  const ip = request.headers.get('CF-Connecting-IP') || '0';
  if (!(await rateOk(env, 'book:' + ip, 5, 600)))
    return json({ success: false, message: 'Too many requests, try again later.' }, 429);

  let inp;
  try { inp = await request.json(); } catch { return json({ success: false, message: 'Bad request' }, 400); }
  if (inp._hp) return json({ success: true, ref: 'MEK-OK' });          // honeypot

  const cap = (k, n) => String(inp[k] ?? '').trim().slice(0, n);
  const serviceId = cap('service', 40);
  const date = cap('date', 10);
  const time = cap('time', 5);
  const name = cap('name', 120);
  const phone = cap('phone', 30).replace(/[^\d+ ]/g, '');
  const address = cap('address', 250);
  const email = cap('email', 150);
  const note = cap('note', 500);

  const svc = SERVICES[serviceId];
  const errs = {};
  if (!svc) errs.service = 'Choose a service';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) errs.date = 'Pick a date';
  if (!/^\d{2}:\d{2}$/.test(time)) errs.time = 'Pick a time';
  if (name.length < 2) errs.name = 'Enter your name';
  if (phone.replace(/\D/g, '').length < 7) errs.phone = 'Enter a valid phone';
  if (address.length < 5) errs.address = 'Enter street and house';
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Invalid e-mail';
  if (Object.keys(errs).length)
    return json({ success: false, errors: errs, message: Object.values(errs)[0] }, 422);

  const start = parseTime(time);
  const end = start + svc.duration;

  /* слот вообще существует по правилам (часы/лид-тайм/шаг)? */
  const valid = await freeSlots(env, date, svc.duration);
  if (!valid.includes(start))
    return json({ success: false, code: 'slot_taken', message: 'Sorry, this time was just taken — please pick another slot.' }, 409);

  const b = {
    ref: newRef(), service_id: serviceId, service_name: svc.name, price: svc.price,
    date, start_min: start, end_min: end, buffer_min: BUFFER_MIN,
    name, phone, email, address, note, token: newToken(),
  };

  /* атомарная вставка: конфликт проверяется в самом INSERT (гонки исключены) */
  const ourEndBuf = end + BUFFER_MIN;
  const res = await env.DB.prepare(`
    INSERT INTO bookings (ref,status,service_id,service_name,price,date,start_min,end_min,buffer_min,name,phone,email,address,note,token,source,created_at)
    SELECT ?1,'confirmed',?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,'online',?15
    WHERE NOT EXISTS (
      SELECT 1 FROM bookings
      WHERE date=?5 AND status IN ('confirmed','done','block')
        AND start_min < ?16 AND ?6 < end_min + buffer_min
    )`)
    .bind(b.ref, b.service_id, b.service_name, b.price, b.date, b.start_min, b.end_min, b.buffer_min,
          b.name, b.phone, b.email, b.address, b.note, b.token, new Date().toISOString(), ourEndBuf)
    .run();

  if (!res.meta.changes)
    return json({ success: false, code: 'slot_taken', message: 'Sorry, this time was just taken — please pick another slot.' }, 409);

  const siteUrl = new URL(request.url).origin;
  await notifyNewBooking(env, b, siteUrl);

  return json({
    success: true,
    ref: b.ref,
    when: prettyDate(date) + ' · ' + time,
    service: svc.name,
    emailSent: !!email && !!env.RESEND_API_KEY,
    manageUrl: siteUrl + '/manage?t=' + b.token,
  });
}

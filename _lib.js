import { SERVICES, freeSlots, fmtTime, json } from './_lib.js';

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ success: false, message: 'Booking is being set up — please WhatsApp us for now.' }, 503);
  const url = new URL(request.url);
  const date = url.searchParams.get('date') || '';
  const serviceId = url.searchParams.get('service') || '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return json({ success: false, message: 'Bad date' }, 400);
  const svc = SERVICES[serviceId];
  if (!svc) return json({ success: false, message: 'Unknown service' }, 400);
  const slots = await freeSlots(env, date, svc.duration);
  return json({ success: true, date, service: serviceId, slots: slots.map(fmtTime) });
}

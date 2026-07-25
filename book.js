import { SERVICES, MAX_DAYS_AHEAD, json } from './_lib.js';

export async function onRequestGet() {
  return json({
    success: true,
    services: Object.entries(SERVICES).map(([id, s]) => ({ id, ...s })),
    maxDaysAhead: MAX_DAYS_AHEAD,
  });
}

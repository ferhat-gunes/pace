/**
 * Companion Cloudflare Worker for scheduled Web Push reminders.
 * Shares the same D1 database (`DB`) as the Cloudflare Pages app.
 */
import { dispatchDueDailyPushes } from '../functions/api/[[path]].js';

export default {
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(dispatchDueDailyPushes(env));
  },
  async fetch(request, env) {
    if (new URL(request.url).pathname === '/health') {
      return new Response(JSON.stringify({ ok: true, hasDb: Boolean(env.DB) }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response('PACE Push Dispatcher', { status: 200 });
  },
};

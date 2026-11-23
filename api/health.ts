// GET /api/health  →  which settings are configured (never the values). Handy while setting up.
import { env, handler, json } from './_lib.js'

export default handler('GET', async () => {
  const has = (k: string) => !!env(k)
  return json({
    ok: true,
    database: has('SUPABASE_SERVICE_ROLE_KEY') && (has('SUPABASE_URL') || has('VITE_SUPABASE_URL')),
    payments: has('STRIPE_SECRET_KEY') && has('STRIPE_PRICE_MONTHLY'),
    yearlyPrice: has('STRIPE_PRICE_YEARLY'),
    webhook: has('STRIPE_WEBHOOK_SECRET'),
    betaCodes: has('BETA_CODES'),
    appUrl: env('APP_URL') ?? null,
  })
})

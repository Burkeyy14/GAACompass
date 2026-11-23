// POST /api/redeem  { code }  →  { plan: 'pro' }
// Beta codes give Pro for free, e.g. for friends testing the app.
// Set BETA_CODES in Vercel as a comma-separated list, e.g. "DOORA2026,ULWOLVES".
import { env, getEntitlement, handler, HttpError, json, requireUser, saveEntitlement } from './_lib.js'

export default handler('POST', async request => {
  const user = await requireUser(request)
  const { code } = (await request.json().catch(() => ({}))) as { code?: string }
  const codes = (env('BETA_CODES') ?? '')
    .split(',')
    .map(c => c.trim().toUpperCase())
    .filter(Boolean)
  if (!code || !codes.includes(code.trim().toUpperCase())) throw new HttpError(400, "That code isn't valid")

  const ent = await getEntitlement(user.id)
  if (ent?.plan === 'pro') return json({ plan: 'pro', already: true })
  await saveEntitlement({ user_id: user.id, plan: 'pro', source: 'beta', status: 'beta', stripe_customer_id: ent?.stripe_customer_id ?? null })
  return json({ plan: 'pro' })
})

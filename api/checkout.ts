// POST /api/checkout  { interval: 'month' | 'year' }  →  { url }  (Stripe Checkout page)
import { appUrl, env, getEntitlement, handler, HttpError, json, requireUser, saveEntitlement, stripe } from './_lib.js'

export default handler('POST', async request => {
  const user = await requireUser(request)
  const body = (await request.json().catch(() => ({}))) as { interval?: string }
  const price = body.interval === 'year' ? env('STRIPE_PRICE_YEARLY') : env('STRIPE_PRICE_MONTHLY')
  if (!price) throw new HttpError(501, 'Payments are not set up yet')

  const ent = await getEntitlement(user.id)
  if (ent?.plan === 'pro' && ent.source === 'stripe') throw new HttpError(409, 'You already have Pro')

  // One Stripe customer per player, remembered in entitlements
  let customer = ent?.stripe_customer_id ?? null
  if (!customer) {
    const c = await stripe().customers.create({ email: user.email, metadata: { user_id: user.id } })
    customer = c.id
    await saveEntitlement({ user_id: user.id, plan: ent?.plan ?? 'free', source: ent?.source ?? null, stripe_customer_id: customer })
  }

  const base = appUrl(request)
  const session = await stripe().checkout.sessions.create({
    mode: 'subscription',
    customer,
    client_reference_id: user.id,
    line_items: [{ price, quantity: 1 }],
    subscription_data: { metadata: { user_id: user.id } },
    allow_promotion_codes: true,
    success_url: `${base}/?pro=success`,
    cancel_url: `${base}/?pro=cancelled`,
  })
  return json({ url: session.url })
})

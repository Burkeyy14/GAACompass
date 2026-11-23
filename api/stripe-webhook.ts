// POST /api/stripe-webhook  (called by Stripe, not the app)
// Keeps the entitlements table in sync with the player's subscription.
import type Stripe from 'stripe'
import { admin, env, fail, getEntitlement, handler, HttpError, json, saveEntitlement, stripe } from './_lib.js'

const ACTIVE = new Set(['active', 'trialing', 'past_due'])

async function userIdFor(sub: Stripe.Subscription): Promise<string | null> {
  if (sub.metadata?.user_id) return sub.metadata.user_id
  const customer = typeof sub.customer === 'string' ? sub.customer : sub.customer.id
  const { data } = await admin().from('entitlements').select('user_id').eq('stripe_customer_id', customer).maybeSingle()
  return (data as { user_id: string } | null)?.user_id ?? null
}

async function sync(sub: Stripe.Subscription) {
  const userId = await userIdFor(sub)
  if (!userId) {
    console.warn('No user for subscription', sub.id)
    return
  }
  const existing = await getEntitlement(userId)
  const active = ACTIVE.has(sub.status)
  // Don't take Pro away from someone who also has it from a beta code
  const keepBeta = !active && existing?.source === 'beta'
  const periodEnd = sub.items?.data?.[0]?.current_period_end
  await saveEntitlement({
    user_id: userId,
    plan: active || keepBeta ? 'pro' : 'free',
    source: keepBeta ? 'beta' : 'stripe',
    status: sub.status,
    stripe_customer_id: typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
    stripe_subscription_id: sub.id,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
  })
}

export default handler('POST', async request => {
  const secret = env('STRIPE_WEBHOOK_SECRET')
  if (!secret) throw new HttpError(501, 'Webhook secret not configured')
  const signature = request.headers.get('stripe-signature')
  if (!signature) return fail(400, 'Missing signature')

  const raw = await request.text()
  let event: Stripe.Event
  try {
    event = await stripe().webhooks.constructEventAsync(raw, signature, secret)
  } catch {
    return fail(400, 'Bad signature')
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const s = event.data.object as Stripe.Checkout.Session
      if (s.subscription) {
        const subId = typeof s.subscription === 'string' ? s.subscription : s.subscription.id
        await sync(await stripe().subscriptions.retrieve(subId))
      }
      break
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      await sync(event.data.object as Stripe.Subscription)
      break
    default:
      break
  }
  return json({ received: true })
})

// POST /api/portal  →  { url }  (Stripe customer portal: change plan, update card, cancel)
import { appUrl, getEntitlement, handler, HttpError, json, requireUser, stripe } from './_lib.js'

export default handler('POST', async request => {
  const user = await requireUser(request)
  const ent = await getEntitlement(user.id)
  if (!ent?.stripe_customer_id) throw new HttpError(404, 'No subscription found')
  const session = await stripe().billingPortal.sessions.create({ customer: ent.stripe_customer_id, return_url: `${appUrl(request)}/` })
  return json({ url: session.url })
})

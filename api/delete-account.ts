// POST /api/delete-account  →  { deleted: true }
// Cancels any subscription, then deletes the auth user. All their records and their
// entitlement are removed by the database's "on delete cascade".
import { admin, env, getEntitlement, handler, HttpError, json, requireUser, stripe } from './_lib.js'

export default handler('POST', async request => {
  const user = await requireUser(request)
  const ent = await getEntitlement(user.id)
  if (ent?.stripe_subscription_id && ent.source === 'stripe' && env('STRIPE_SECRET_KEY')) {
    try {
      await stripe().subscriptions.cancel(ent.stripe_subscription_id)
    } catch (e) {
      console.warn('Could not cancel subscription', e)
    }
  }
  const { error } = await admin().auth.admin.deleteUser(user.id)
  if (error) throw new HttpError(500, error.message)
  return json({ deleted: true })
})

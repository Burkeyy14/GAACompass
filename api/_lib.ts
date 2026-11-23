// Shared helpers for the Vercel functions in /api.
// Files starting with "_" are not deployed as their own endpoints.
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import Stripe from 'stripe'

export function env(name: string): string | undefined {
  const v = process.env[name]
  return v && v.trim() ? v.trim() : undefined
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } })
}

export const fail = (status: number, error: string) => json({ error }, status)

let _admin: SupabaseClient | null = null
/** Supabase client with the service-role key: bypasses Row Level Security. Server only. */
export function admin(): SupabaseClient {
  if (_admin) return _admin
  const url = env('SUPABASE_URL') ?? env('VITE_SUPABASE_URL')
  const key = env('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) throw new HttpError(500, 'Server is missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY')
  _admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  return _admin
}

let _stripe: Stripe | null = null
export function stripe(): Stripe {
  if (_stripe) return _stripe
  const key = env('STRIPE_SECRET_KEY')
  if (!key) throw new HttpError(501, 'Payments are not set up yet')
  _stripe = new Stripe(key, { httpClient: Stripe.createFetchHttpClient() })
  return _stripe
}

export class HttpError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

/** The signed-in user, from the "Authorization: Bearer <access token>" header. */
export async function requireUser(request: Request): Promise<User> {
  const auth = request.headers.get('authorization') ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (!token) throw new HttpError(401, 'Not signed in')
  const { data, error } = await admin().auth.getUser(token)
  if (error || !data.user) throw new HttpError(401, 'Session expired, please sign in again')
  return data.user
}

export function appUrl(request: Request): string {
  return (env('APP_URL') ?? new URL(request.url).origin).replace(/\/$/, '')
}

export interface Entitlement {
  user_id: string
  plan: 'free' | 'pro'
  source: 'stripe' | 'beta' | 'manual' | null
  status: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  current_period_end: string | null
}

export async function getEntitlement(userId: string): Promise<Entitlement | null> {
  const { data, error } = await admin().from('entitlements').select('*').eq('user_id', userId).maybeSingle()
  if (error) throw new HttpError(500, error.message)
  return data as Entitlement | null
}

export async function saveEntitlement(row: Partial<Entitlement> & { user_id: string }): Promise<void> {
  const { error } = await admin()
    .from('entitlements')
    .upsert({ ...row, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  if (error) throw new HttpError(500, error.message)
}

/** Wrap a handler: only allow the given method, turn thrown HttpErrors into JSON responses. */
export function handler(method: string, fn: (request: Request) => Promise<Response>) {
  return {
    async fetch(request: Request): Promise<Response> {
      if (request.method !== method) return fail(405, `Use ${method}`)
      try {
        return await fn(request)
      } catch (e) {
        if (e instanceof HttpError) return fail(e.status, e.message)
        console.error(e)
        return fail(500, 'Something went wrong')
      }
    },
  }
}

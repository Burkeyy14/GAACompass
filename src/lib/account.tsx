// Pro status, server API calls and account helpers.
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from './backend'
import { DEMO, lsGet, lsSet } from './env'

export async function api<T = unknown>(path: string, body?: unknown): Promise<T> {
  const session = supabase ? (await supabase.auth.getSession()).data.session : null
  const res = await fetch(`/api/${path}`, {
    method: body === undefined && path === 'health' ? 'GET' : 'POST',
    headers: { 'content-type': 'application/json', ...(session ? { authorization: `Bearer ${session.access_token}` } : {}) },
    body: body === undefined && path === 'health' ? undefined : JSON.stringify(body ?? {}),
  })
  const data = (await res.json().catch(() => ({}))) as T & { error?: string }
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`)
  return data
}

export interface ProState {
  pro: boolean
  source: string | null
  status: string | null
  renews: string | null
  loading: boolean
  /** device-only Pro (no account), for trying the app */
  local: boolean
  refresh: () => Promise<void>
  setLocalPro: (on: boolean) => void
}

const Ctx = createContext<ProState | null>(null)
const LOCAL_PRO = 'gaa-compass:local-pro'

export function ProProvider({ userId, children }: { userId: string | null; children: ReactNode }) {
  const [state, setState] = useState({ pro: false, source: null as string | null, status: null as string | null, renews: null as string | null, loading: true })
  const [localPro, setLocalProState] = useState(() => DEMO || lsGet(LOCAL_PRO) === '1')

  const refresh = useCallback(async () => {
    if (!userId || !supabase) {
      setState(s => ({ ...s, loading: false }))
      return
    }
    const { data } = await supabase.from('entitlements').select('plan,source,status,current_period_end').eq('user_id', userId).maybeSingle()
    const row = data as { plan: string; source: string | null; status: string | null; current_period_end: string | null } | null
    setState({ pro: row?.plan === 'pro', source: row?.source ?? null, status: row?.status ?? null, renews: row?.current_period_end ?? null, loading: false })
  }, [userId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  // Coming back from Stripe Checkout: the webhook can take a few seconds, so poll briefly.
  useEffect(() => {
    if (!userId || !new URLSearchParams(location.search).has('pro')) return
    let n = 0
    const t = setInterval(() => {
      n++
      void refresh()
      if (n > 10) clearInterval(t)
    }, 2000)
    return () => clearInterval(t)
  }, [userId, refresh])

  const setLocalPro = (on: boolean) => {
    lsSet(LOCAL_PRO, on ? '1' : null)
    setLocalProState(on)
  }

  const local = !userId
  const value: ProState = { ...state, pro: local ? localPro : state.pro, local, refresh, setLocalPro }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function usePro(): ProState {
  const v = useContext(Ctx)
  if (!v) throw new Error('usePro outside provider')
  return v
}

export const APP_VERSION = '1.1.0-beta'

export const PRICE_LABEL = {
  month: (import.meta.env.VITE_PRICE_MONTHLY_LABEL as string | undefined) ?? '€3.99 / month',
  year: (import.meta.env.VITE_PRICE_YEARLY_LABEL as string | undefined) ?? '€29.99 / year',
}

export function friendlyAuthError(msg: string): string {
  const m = msg.toLowerCase()
  if (m.includes('invalid login')) return 'Wrong email or password.'
  if (m.includes('email not confirmed')) return 'Confirm your email first. Check your inbox (and spam).'
  if (m.includes('already registered') || m.includes('already been registered')) return 'There is already an account with that email. Try signing in.'
  if (m.includes('password should be')) return 'Use a password of at least 8 characters.'
  if (m.includes('rate limit')) return 'Too many attempts. Wait a minute and try again.'
  if (m.includes('not authorized')) return "We couldn't send an email to that address yet. Ask the app owner to finish email setup."
  if (m.includes('failed to fetch') || m.includes('network')) return "Can't reach the server. Check your connection."
  return msg
}

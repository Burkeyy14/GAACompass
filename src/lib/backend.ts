// Data layer. Two modes:
//  - cloud: Supabase (accounts + Postgres). Every write is cached locally first,
//           then sent to the server; failed writes are queued and retried when back online.
//  - local: no account, data saved in this browser only (demo / try-before-signup).

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { AppData, CollectionKey } from './types'
import { DEFAULT_PROFILE, emptyData, normalizeProfile } from './defaults'
import { DEMO } from './env'
export { DEFAULT_PROFILE, emptyData }

const URL = import.meta.env?.VITE_SUPABASE_URL as string | undefined
const KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabase: SupabaseClient | null = URL && KEY ? createClient(URL, KEY) : null
export const cloudAvailable = !!supabase

const COLLECTIONS: CollectionKey[] = ['checkins', 'weekPlans', 'sessions', 'frees', 'goals', 'benchmarks']

type Op = { op: 'put'; kind: string; id: string; data: unknown } | { op: 'del'; kind: string; id: string }

export interface Backend {
  mode: 'cloud' | 'local'
  userKey: string
  load(): Promise<AppData>
  put(kind: CollectionKey | 'profile', id: string, data: unknown): Promise<void>
  del(kind: CollectionKey, id: string): Promise<void>
  pending(): number
}

function readJSON<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key)
    return v ? (JSON.parse(v) as T) : fallback
  } catch {
    return fallback
  }
}
function writeJSON(key: string, v: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(v))
  } catch {
    /* storage full or unavailable */
  }
}

function applyLocal(data: AppData, kind: string, id: string, value: unknown | null): AppData {
  if (kind === 'profile') return value ? { ...data, profile: normalizeProfile(value as Record<string, unknown>) } : data
  const k = kind as CollectionKey
  const list = (data[k] as { id: string }[]).filter(r => r.id !== id)
  if (value) list.push(value as { id: string })
  return { ...data, [k]: list }
}

export function localBackend(): Backend {
  const key = DEMO ? 'gaa-compass:demo-v2' : 'gaa-compass:local'
  return {
    mode: 'local',
    userKey: 'local',
    async load() {
      const stored = readJSON<Partial<AppData> | null>(key, null)
      if (!stored && DEMO) {
        const { sampleData } = await import('./sample')
        const d = sampleData()
        writeJSON(key, d)
        return d
      }
      const base = emptyData()
      return { ...base, ...(stored ?? {}), profile: normalizeProfile((stored?.profile ?? {}) as Record<string, unknown>) }
    },
    async put(kind, id, value) {
      writeJSON(key, applyLocal({ ...emptyData(), ...readJSON<Partial<AppData>>(key, {}) }, kind, id, value))
    },
    async del(kind, id) {
      writeJSON(key, applyLocal({ ...emptyData(), ...readJSON<Partial<AppData>>(key, {}) }, kind, id, null))
    },
    pending: () => 0,
  }
}

export function cloudBackend(userId: string): Backend {
  const sb = supabase!
  const cacheKey = `gaa-compass:cache:${userId}`
  const queueKey = `gaa-compass:queue:${userId}`

  const cache = () => ({ ...emptyData(), ...readJSON<Partial<AppData>>(cacheKey, {}) })
  const queue = () => readJSON<Op[]>(queueKey, [])

  async function send(op: Op) {
    if (op.op === 'put') {
      const { error } = await sb.from('records').upsert({ user_id: userId, kind: op.kind, id: op.id, data: op.data, updated_at: new Date().toISOString() })
      if (error) throw error
    } else {
      const { error } = await sb.from('records').delete().match({ user_id: userId, kind: op.kind, id: op.id })
      if (error) throw error
    }
  }

  async function flush() {
    let q = queue()
    while (q.length) {
      try {
        await send(q[0])
      } catch {
        return
      }
      q = q.slice(1)
      writeJSON(queueKey, q)
    }
  }

  async function run(op: Op) {
    writeJSON(queueKey, [...queue(), op])
    await flush()
  }

  if (typeof window !== 'undefined') window.addEventListener('online', () => void flush())

  return {
    mode: 'cloud',
    userKey: userId,
    async load() {
      await flush()
      const { data, error } = await sb.from('records').select('kind,id,data')
      if (error) return cache() // offline → last known data
      let out = emptyData()
      for (const row of data as { kind: string; id: string; data: unknown }[]) {
        if (row.kind === 'profile' || COLLECTIONS.includes(row.kind as CollectionKey)) out = applyLocal(out, row.kind, row.id, row.data)
      }
      // re-apply anything still queued so the UI shows it
      for (const op of queue()) out = applyLocal(out, op.kind, op.id, op.op === 'put' ? op.data : null)
      writeJSON(cacheKey, out)
      return out
    },
    async put(kind, id, value) {
      writeJSON(cacheKey, applyLocal(cache(), kind, id, value))
      await run({ op: 'put', kind, id, data: value })
    },
    async del(kind, id) {
      writeJSON(cacheKey, applyLocal(cache(), kind, id, null))
      await run({ op: 'del', kind, id })
    },
    pending: () => queue().length,
  }
}

export { applyLocal }

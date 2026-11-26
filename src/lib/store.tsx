import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { AppData, CollectionKey, DayActivity, Profile, SessionLog, WeekPlan } from './types'
import { mondayOf, weekday } from './dates'
import { CATEGORY_ACTIVITY, suggestedWeekDays } from './generator'
import { applyLocal, type Backend } from './backend'
import { emptyData } from './defaults'

interface Store {
  data: AppData
  ready: boolean
  backend: Backend
  put<K extends CollectionKey>(kind: K, record: AppData[K][number]): void
  remove(kind: CollectionKey, id: string): void
  updateProfile(p: Partial<Profile>): void
  /** Save a completed session AND tick it into that week's planner. */
  logSession(s: SessionLog): void
  replaceAll(d: AppData): Promise<void>
}

const Ctx = createContext<Store | null>(null)

export function StoreProvider({ backend, children }: { backend: Backend; children: ReactNode }) {
  const [data, setData] = useState<AppData>(emptyData())
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let live = true
    setReady(false)
    backend.load().then(d => {
      if (live) {
        setData(d)
        setReady(true)
      }
    })
    return () => {
      live = false
    }
  }, [backend])

  const put = useCallback(
    <K extends CollectionKey>(kind: K, record: AppData[K][number]) => {
      const r = record as { id: string }
      setData(d => applyLocal(d, kind, r.id, r))
      void backend.put(kind, r.id, r)
    },
    [backend],
  )

  const remove = useCallback(
    (kind: CollectionKey, id: string) => {
      setData(d => applyLocal(d, kind, id, null))
      void backend.del(kind, id)
    },
    [backend],
  )

  const updateProfile = useCallback(
    (p: Partial<Profile>) => {
      setData(d => {
        const profile = { ...d.profile, ...p }
        void backend.put('profile', 'me', profile)
        return { ...d, profile }
      })
    },
    [backend],
  )

  const logSession = useCallback(
    (s: SessionLog) => {
      setData(d => {
        const next = applyLocal(d, 'sessions', s.id, s)
        const monday = mondayOf(s.date)
        const existing = d.weekPlans.find(w => w.weekStart === monday)
        const days = existing ? existing.days.map(x => [...x]) : suggestedWeekDays(d.goals, d.profile, monday)
        const i = weekday(s.date)
        const act = CATEGORY_ACTIVITY[s.category]
        const list: DayActivity[] = days[i].filter(a => a !== 'rest')
        if (!list.includes(act)) list.push(act)
        days[i] = list
        const plan: WeekPlan = { id: monday, weekStart: monday, days }
        void backend.put('sessions', s.id, s)
        void backend.put('weekPlans', monday, plan)
        return applyLocal(next, 'weekPlans', monday, plan)
      })
    },
    [backend],
  )

  const replaceAll = useCallback(
    async (d: AppData) => {
      setData(d)
      await backend.put('profile', 'me', d.profile)
      const kinds: CollectionKey[] = ['checkins', 'weekPlans', 'sessions', 'frees', 'goals', 'benchmarks', 'nutrition', 'weights']
      for (const k of kinds) for (const r of d[k] as { id: string }[]) await backend.put(k, r.id, r)
    },
    [backend],
  )

  const value = useMemo(() => ({ data, ready, backend, put, remove, updateProfile, logSession, replaceAll }), [data, ready, backend, put, remove, updateProfile, logSession, replaceAll])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore(): Store {
  const s = useContext(Ctx)
  if (!s) throw new Error('useStore outside provider')
  return s
}

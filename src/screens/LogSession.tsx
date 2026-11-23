// Quick log for sessions the app doesn't prescribe: club training, matches, anything else.
// Everything logged here is also ticked into that week's planner.
import { useState } from 'react'
import type { SessionCategory, SessionLog } from '../lib/types'
import { useStore } from '../lib/store'
import { today, uid } from '../lib/dates'
import { CatBadge } from '../components/Icon'
import { Slider, Stepper } from '../components/ui'

const QUICK: { value: SessionCategory; label: string; minutes: number; rpe: number }[] = [
  { value: 'pitch', label: 'Club training', minutes: 75, rpe: 6 },
  { value: 'match', label: 'Match', minutes: 70, rpe: 8 },
  { value: 'gym', label: 'Own gym session', minutes: 50, rpe: 6 },
  { value: 'conditioning', label: 'Run', minutes: 30, rpe: 6 },
  { value: 'skills', label: 'Skills', minutes: 30, rpe: 4 },
  { value: 'recovery', label: 'Recovery', minutes: 25, rpe: 2 },
]

export function QuickLog({ prefill, onDone }: { prefill?: Partial<SessionLog>; onDone: () => void }) {
  const { logSession } = useStore()
  const [s, setS] = useState<SessionLog>({ id: uid(), date: today(), category: 'pitch', title: 'Club training', minutes: 75, rpe: 6, ...prefill })
  const set = (p: Partial<SessionLog>) => setS(x => ({ ...x, ...p }))

  return (
    <div className="stack">
      <div className="grid3">
        {QUICK.map(q => (
          <button
            key={q.value}
            className="card tight center"
            style={{ padding: 12, outline: s.category === q.value ? '2px solid var(--accent)' : 'none', outlineOffset: -2 }}
            onClick={() => set({ category: q.value, title: q.label, minutes: q.minutes, rpe: q.rpe })}
          >
            <CatBadge cat={q.value} size={38} />
            <div className="tiny" style={{ fontWeight: 700, marginTop: 6 }}>{q.label}</div>
          </button>
        ))}
      </div>
      <div className="card stack">
        <div className="grid2">
          <label className="field">
            Date
            <input type="date" value={s.date} max={today()} onChange={e => set({ date: e.target.value })} />
          </label>
          <div className="field">
            Minutes
            <Stepper value={s.minutes} onChange={v => set({ minutes: v })} step={5} min={5} />
          </div>
        </div>
        <Slider label="How hard was it? (RPE)" value={s.rpe} onChange={v => set({ rpe: v })} low="Very easy" high="Maximal" />
        <div className="tiny muted">
          Load: {s.minutes} min × {s.rpe} = <b>{s.minutes * s.rpe}</b>. Rate the whole session about 30 minutes after it ends.
        </div>
        <textarea placeholder="Notes (optional)" value={s.notes ?? ''} onChange={e => set({ notes: e.target.value })} />
      </div>
      <button
        className="btn block lg"
        onClick={() => {
          logSession(s)
          onDone()
        }}
      >
        Log it
      </button>
    </div>
  )
}

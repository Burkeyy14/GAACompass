import { useState } from 'react'
import type { BodyArea, CheckIn, TightnessLevel } from '../lib/types'
import { useStore } from '../lib/store'
import { today } from '../lib/dates'
import { readiness, RECOVERY_EXPLAINER } from '../lib/recovery'
import { Chips, Slider, Ring, LEVEL_COLOR } from '../components/ui'
import { Icon } from '../components/Icon'

const AREAS: { value: BodyArea; label: string }[] = [
  { value: 'hamstring', label: 'Hamstring' },
  { value: 'groin', label: 'Groin' },
  { value: 'calf', label: 'Calf' },
  { value: 'quad', label: 'Quad' },
  { value: 'hip', label: 'Hip' },
  { value: 'back', label: 'Back' },
  { value: 'knee', label: 'Knee' },
  { value: 'ankle', label: 'Ankle' },
  { value: 'shoulder', label: 'Shoulder' },
  { value: 'other', label: 'Other' },
]

export function CheckInForm({ onDone }: { onDone: () => void }) {
  const { data, put } = useStore()
  const date = today()
  const existing = data.checkins.find(c => c.date === date)
  const [c, setC] = useState<CheckIn>(existing ?? { id: date, date, sleep: 7, energy: 7, soreness: 3, stress: 3, rpe: 5, tightness: 'none', areas: [] })
  const [explain, setExplain] = useState(false)
  const set = (patch: Partial<CheckIn>) => setC(x => ({ ...x, ...patch }))
  const r = readiness(c, data.checkins)

  return (
    <div className="stack">
      <div className="card stack" style={{ gap: 14 }}>
        <Slider label="Sleep quality" value={c.sleep} onChange={v => set({ sleep: v })} low="Awful" high="Great" />
        <Slider label="Energy" value={c.energy} onChange={v => set({ energy: v })} low="Drained" high="Buzzing" />
        <Slider label="Muscle soreness" value={c.soreness} onChange={v => set({ soreness: v })} low="None" high="Very sore" />
        <Slider label="Stress (work, study, life)" value={c.stress} onChange={v => set({ stress: v })} low="Relaxed" high="Very stressed" />
        <Slider label="Yesterday's session effort" min={0} value={c.rpe} onChange={v => set({ rpe: v })} low="0 = rest day" high="Max" />
      </div>

      <div className="card stack">
        <h3>Any tightness or pain?</h3>
        <div className="seg">
          {(['none', 'mild', 'sharp'] as TightnessLevel[]).map(t => (
            <button key={t} className={c.tightness === t ? 'on' : ''} onClick={() => set({ tightness: t, areas: t === 'none' ? [] : c.areas })}>
              {{ none: 'None', mild: 'Mild', sharp: 'Sharp pain' }[t]}
            </button>
          ))}
        </div>
        {c.tightness !== 'none' && (
          <>
            <div className="small muted">Where?</div>
            <Chips options={AREAS} value={c.areas} onChange={a => set({ areas: c.areas.includes(a) ? c.areas.filter(x => x !== a) : [...c.areas, a] })} />
          </>
        )}
      </div>

      <div className="card">
        <div className="row" style={{ gap: 16 }}>
          <Ring value={r.score} size={84} color={LEVEL_COLOR[r.level]} />
          <div className="grow">
            <div style={{ fontWeight: 700, fontSize: 17 }}>{r.headline}</div>
            <div className="small muted" style={{ marginTop: 2 }}>{r.advice}</div>
          </div>
        </div>
        {r.reasons.length > 0 && (
          <div className="chips" style={{ marginTop: 12 }}>
            {r.reasons.map(x => <span key={x} className="pill grey">{x}</span>)}
          </div>
        )}
        <button className="link small" style={{ marginTop: 12 }} onClick={() => setExplain(x => !x)}>
          <Icon name="info" size={16} /> {explain ? 'Hide' : 'How is this calculated?'}
        </button>
        {explain && <div className="explain" style={{ marginTop: 10 }}>{RECOVERY_EXPLAINER}</div>}
      </div>

      <button className="btn block lg" onClick={() => { put('checkins', c); onDone() }}>Save check-in</button>
    </div>
  )
}

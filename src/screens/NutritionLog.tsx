// Nutrition logging: food entry, weight entry, CSV import, Fuel row for Today.
import { useRef, useState } from 'react'
import type { NutritionLog, WeightLog } from '../lib/types'
import { useStore } from '../lib/store'
import { parseMfpCsv, validateMfpUrl, dailyTargets, redsWarning } from '../lib/nutrition'
import { addDays, mondayOf, today, weekday } from '../lib/dates'
import { Banner, Sheet } from '../components/ui'
import { Icon } from '../components/Icon'

const DIRECTION_LABEL = { lose: 'Lean out', maintain: 'Maintain', gain: 'Build size' }

// ---- Food log sheet ----

export function FoodLogSheet({ onDone, prefillDate }: { onDone: () => void; prefillDate?: string }) {
  const { data, put } = useStore()
  const date = prefillDate ?? today()

  const yesterday = addDays(date, -1)
  const yLog = data.nutrition.find(n => n.date === yesterday)
  const existing = data.nutrition.find(n => n.date === date)

  const [kcal, setKcal] = useState(String(existing?.kcal ?? yLog?.kcal ?? ''))
  const [protein, setProtein] = useState(String(existing?.protein ?? yLog?.protein ?? ''))
  const [carbs, setCarbs] = useState(String(existing?.carbs ?? yLog?.carbs ?? ''))
  const [fat, setFat] = useState(String(existing?.fat ?? yLog?.fat ?? ''))
  const mfpUrl = data.profile.mfpUrl

  function save() {
    const k = parseInt(kcal)
    const p = parseInt(protein)
    if (!k || !p) return
    const log: NutritionLog = {
      id: date, date,
      kcal: k, protein: p,
      carbs: carbs ? parseInt(carbs) : undefined,
      fat: fat ? parseInt(fat) : undefined,
      source: 'manual',
    }
    put('nutrition', log)
    onDone()
  }

  const valid = !!parseInt(kcal) && !!parseInt(protein)

  return (
    <div className="stack">
      {mfpUrl && validateMfpUrl(mfpUrl) && (
        <div className="card tight">
          <div className="small muted" style={{ marginBottom: 8 }}>Copy your totals from MyFitnessPal (Diary &rarr; Totals), then enter them below.</div>
          <a href={mfpUrl} target="_blank" rel="noreferrer" className="btn glassy block" style={{ textDecoration: 'none' }}>
            <Icon name="share" size={16} /> Open MyFitnessPal
          </a>
        </div>
      )}
      <div className="card stack">
        <label className="field">
          Calories (required)
          <div className="unit-input">
            <input type="number" inputMode="numeric" min={0} max={9999} value={kcal} onChange={e => setKcal(e.target.value)} autoFocus />
            <span>kcal</span>
          </div>
        </label>
        <label className="field">
          Protein (required)
          <div className="unit-input">
            <input type="number" inputMode="numeric" min={0} max={999} value={protein} onChange={e => setProtein(e.target.value)} />
            <span>g</span>
          </div>
        </label>
        <label className="field">
          Carbs (optional)
          <div className="unit-input">
            <input type="number" inputMode="numeric" min={0} max={999} value={carbs} onChange={e => setCarbs(e.target.value)} />
            <span>g</span>
          </div>
        </label>
        <label className="field">
          Fat (optional)
          <div className="unit-input">
            <input type="number" inputMode="numeric" min={0} max={999} value={fat} onChange={e => setFat(e.target.value)} />
            <span>g</span>
          </div>
        </label>
      </div>
      {yLog && !existing && <div className="tiny muted" style={{ padding: '0 4px' }}>Fields pre-filled from yesterday as placeholders.</div>}
      <button className="btn block lg" disabled={!valid} onClick={save}>Save food log</button>
    </div>
  )
}

// ---- Weight log sheet ----

export function WeightLogSheet({ onDone }: { onDone: () => void }) {
  const { data, put } = useStore()
  const existing = data.weights.find(w => w.date === today())
  const [kg, setKg] = useState(String(existing?.kg ?? ''))

  function save() {
    const v = parseFloat(kg)
    if (!v) return
    const log: WeightLog = { id: today(), date: today(), kg: v }
    put('weights', log)
    onDone()
  }

  return (
    <div className="stack">
      <div className="card stack">
        <label className="field">
          Body weight
          <div className="unit-input">
            <input type="number" inputMode="decimal" min={30} max={200} step={0.1} value={kg} onChange={e => setKg(e.target.value)} autoFocus />
            <span>kg</span>
          </div>
        </label>
      </div>
      <div className="small muted" style={{ padding: '0 4px' }}>Weigh yourself at the same time each week (e.g. Monday morning before eating) for consistent tracking.</div>
      <button className="btn block lg" disabled={!parseFloat(kg)} onClick={save}>Save weight</button>
    </div>
  )
}

// ---- CSV import sheet ----

export function CsvImportSheet({ onDone }: { onDone: () => void }) {
  const { put } = useStore()
  const [preview, setPreview] = useState<ReturnType<typeof parseMfpCsv> | null>(null)
  const [saved, setSaved] = useState(false)
  const ref = useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const text = ev.target?.result as string
      setPreview(parseMfpCsv(text))
    }
    reader.readAsText(file)
  }

  function importAll() {
    if (!preview) return
    for (const row of preview.rows) {
      put('nutrition', { id: row.date, date: row.date, kcal: row.kcal, protein: row.protein, carbs: row.carbs, fat: row.fat, source: 'csv' })
    }
    setSaved(true)
  }

  return (
    <div className="stack">
      <div className="small muted" style={{ padding: '0 4px' }}>
        Export your data from MyFitnessPal: Food &rarr; Reports &rarr; Nutrition &rarr; Export. Then select the CSV file here. Nothing is uploaded to any server other than your own account.
      </div>
      {!saved ? (
        <>
          <input ref={ref} type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={handleFile} />
          <button className="btn glassy block" onClick={() => ref.current?.click()}>
            <Icon name="download" size={18} /> Select CSV file
          </button>
          {preview && (
            <>
              {preview.errors.length > 0 && preview.errors.map(e => <Banner key={e} kind="red">{e}</Banner>)}
              {preview.rows.length > 0 && (
                <div className="card flush">
                  <div style={{ padding: '10px 16px 6px' }}>
                    <h3>{preview.rows.length} days found</h3>
                    <div className="tiny muted">{preview.rows[0].date} to {preview.rows[preview.rows.length - 1].date}</div>
                  </div>
                  <div className="list" style={{ maxHeight: 240, overflowY: 'auto' }}>
                    {preview.rows.slice(0, 10).map(r => (
                      <div key={r.date} className="li no-icon small">
                        <div className="grow">{r.date}</div>
                        <span className="muted">{r.kcal} kcal · {r.protein}g protein</span>
                      </div>
                    ))}
                    {preview.rows.length > 10 && <div className="li no-icon small muted">…and {preview.rows.length - 10} more</div>}
                  </div>
                </div>
              )}
              {preview.rows.length > 0 && (
                <button className="btn block lg" onClick={importAll}>Import {preview.rows.length} days</button>
              )}
            </>
          )}
        </>
      ) : (
        <>
          <Banner kind="green">Imported {preview?.rows.length ?? 0} days of food data.</Banner>
          <button className="btn block" onClick={onDone}>Done</button>
        </>
      )}
    </div>
  )
}

// ---- Fuel row (compact, shown on Today screen) ----

export function FuelRow({ onLogFood }: { onLogFood: () => void }) {
  const { data } = useStore()
  const bodyGoal = data.goals.find(g => g.active && g.type === 'body')
  const todayISO = today()
  const todayLog = data.nutrition.find(n => n.date === todayISO)

  // Only show if there's a body goal OR the player has logged food before
  if (!bodyGoal && data.nutrition.length === 0) return null

  if (!bodyGoal) {
    return (
      <button className="card tight" onClick={onLogFood}>
        <div className="row">
          <span className="cat-badge" style={{ width: 36, height: 36, background: 'linear-gradient(145deg, #ff6b35, #ff6b35cc)' }}>
            <Icon name="flame" size={20} stroke={2} />
          </span>
          <span className="grow small" style={{ fontWeight: 600 }}>Log today's food</span>
          {todayLog && <span className="pill grey">{todayLog.kcal} kcal</span>}
          <Icon name="right" size={16} className="chev" />
        </div>
      </button>
    )
  }

  const direction = bodyGoal.bodyDirection ?? 'maintain'
  const tomorrowISO = addDays(todayISO, 1)
  const todayPlan = data.weekPlans.find(w => w.weekStart === mondayOf(todayISO))
  const tomorrowPlan = data.weekPlans.find(w => w.weekStart === mondayOf(tomorrowISO))
  const todayActivities = todayPlan?.days[weekday(todayISO)] ?? []
  const tomorrowActivities = tomorrowPlan?.days[weekday(tomorrowISO)] ?? []

  const targets = dailyTargets(data.profile, todayActivities, tomorrowActivities, direction)
  const warn = redsWarning(data.weights, data.nutrition, targets, todayISO)

  const logged = todayLog?.kcal ?? 0
  const pct = targets.kcal > 0 ? Math.min(100, Math.round((logged / targets.kcal) * 100)) : 0

  return (
    <>
      {warn && <Banner kind="amber">{warn}</Banner>}
      <button className="card tight" onClick={onLogFood}>
        <div className="row" style={{ gap: 12 }}>
          <span className="cat-badge" style={{ width: 36, height: 36, background: 'linear-gradient(145deg, #ff6b35, #ff6b35cc)' }}>
            <Icon name="flame" size={20} stroke={2} />
          </span>
          <div className="grow">
            <div style={{ fontWeight: 700, fontSize: 15 }}>{DIRECTION_LABEL[direction]}</div>
            <div className="tiny muted">
              Target: {targets.kcal} kcal · {targets.protein.g}g protein
              {targets.note && <> · <span style={{ color: 'var(--accent)' }}>{targets.note}</span></>}
            </div>
          </div>
          {todayLog ? (
            <div style={{ textAlign: 'right' }}>
              <div className="small" style={{ fontWeight: 700 }}>{pct}%</div>
              <div className="tiny muted">logged</div>
            </div>
          ) : (
            <span className="pill grey">Log food</span>
          )}
        </div>
        {todayLog && (
          <div style={{ marginTop: 8, height: 4, borderRadius: 2, background: 'var(--fill)', overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: pct >= 90 ? 'var(--green)' : '#ff6b35', borderRadius: 2, transition: 'width .3s' }} />
          </div>
        )}
      </button>
    </>
  )
}

// ---- Monday weigh-in prompt ----

export function WeighInPrompt({ onLogWeight }: { onLogWeight: () => void }) {
  const { data } = useStore()
  const bodyGoal = data.goals.find(g => g.active && g.type === 'body')
  if (!bodyGoal) return null

  const isMonday = new Date().getDay() === 1
  if (!isMonday) return null

  const thisWeekHasWeight = data.weights.some(w => {
    const diff = (new Date(today()).getTime() - new Date(w.date).getTime()) / 86400000
    return diff >= 0 && diff < 7
  })
  if (thisWeekHasWeight) return null

  return (
    <Banner kind="info" icon="ruler">
      Monday weigh-in.{' '}
      <button className="link small" onClick={onLogWeight}>Log your weight</button>
      {' '}to track progress.
    </Banner>
  )
}

// ---- Nutrition progress section (for Progress screen) ----

export function NutritionProgress() {
  const { data } = useStore()
  const [showCsv, setShowCsv] = useState(false)
  const bodyGoal = data.goals.find(g => g.active && g.type === 'body')

  const weightsSorted = [...data.weights].sort((a, b) => a.date.localeCompare(b.date)).slice(-12)

  if (!bodyGoal && data.nutrition.length === 0 && data.weights.length === 0) return null

  return (
    <>
      <div className="section-label">Fuel &amp; body</div>
      {weightsSorted.length > 1 && (
        <div className="card">
          <h3>Weight trend</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 60, marginTop: 10 }}>
            {weightsSorted.map((w, i) => {
              const min = Math.min(...weightsSorted.map(x => x.kg))
              const max = Math.max(...weightsSorted.map(x => x.kg))
              const range = max - min || 1
              const pct = ((w.kg - min) / range) * 70 + 15
              return (
                <div key={w.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <div style={{ width: 6, height: `${pct}%`, background: i === weightsSorted.length - 1 ? 'var(--accent)' : 'var(--fill)', borderRadius: 3 }} />
                  <span className="tiny muted" style={{ fontSize: 9 }}>{w.kg}</span>
                </div>
              )
            })}
          </div>
          <div className="tiny muted" style={{ marginTop: 4 }}>Last {weightsSorted.length} weigh-ins</div>
        </div>
      )}
      {weightsSorted.length === 0 && bodyGoal && (
        <div className="card tight small muted">Log a weekly weigh-in to see your trend here.</div>
      )}
      {data.nutrition.length > 0 && (
        <div className="card tight">
          <div className="row between">
            <b>Food logs</b>
            <span className="pill grey">{data.nutrition.length} days</span>
          </div>
          <div className="small muted" style={{ marginTop: 6 }}>
            Avg: {Math.round(data.nutrition.reduce((t, n) => t + n.kcal, 0) / data.nutrition.length)} kcal
            {' · '}{Math.round(data.nutrition.reduce((t, n) => t + n.protein, 0) / data.nutrition.length)}g protein
          </div>
        </div>
      )}
      <button className="btn glassy block sm" onClick={() => setShowCsv(true)}>
        <Icon name="download" size={16} /> Import from MyFitnessPal CSV
      </button>
      {showCsv && (
        <Sheet onClose={() => setShowCsv(false)} title="Import food data">
          <CsvImportSheet onDone={() => setShowCsv(false)} />
        </Sheet>
      )}
    </>
  )
}

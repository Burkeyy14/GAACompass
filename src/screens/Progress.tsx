import type { Nav } from '../App'
import { useStore } from '../lib/store'
import { ProGate, StrengthTracker, ReadinessInsights, LoadTrend, FreesAnalytics } from './ProFeatures'
import { addDays, daysBetween, fromISO, mondayOf, today } from '../lib/dates'
import { recoveryScore } from '../lib/recovery'
import { weeklyLoads } from '../lib/load'
import { Bars, BarLabels } from '../components/ui'
import { ZoneTable } from './Train'
import { Icon } from '../components/Icon'
import { Benchmarks } from './Goals'
import type { BenchmarkTest } from '../lib/types'
import { NutritionProgress } from './NutritionLog'

export function streaks(dates: string[], t: string) {
  const set = new Set(dates)
  let current = 0
  let d = set.has(t) ? t : addDays(t, -1)
  while (set.has(d)) {
    current++
    d = addDays(d, -1)
  }
  const sorted = [...set].sort()
  let best = 0
  let run = 0
  sorted.forEach((x, i) => {
    run = i > 0 && daysBetween(sorted[i - 1], x) === 1 ? run + 1 : 1
    best = Math.max(best, run)
  })
  return { current, best }
}

export function Progress({ nav }: { nav: Nav }) {
  const { data } = useStore()
  const t = today()
  const { current, best } = streaks(data.checkins.map(c => c.date), t)

  const last14 = Array.from({ length: 14 }, (_, i) => addDays(t, i - 13))
  const rec = last14.map(d => {
    const c = data.checkins.find(x => x.date === d)
    const v = c ? recoveryScore(c) : 0
    return { label: d, value: v, color: !c ? 'var(--fill)' : v >= 8 ? 'var(--green)' : v >= 6 ? 'var(--amber)' : 'var(--red)' }
  })
  const avg = (ds: string[]) => {
    const vals = data.checkins.filter(c => ds.includes(c.date)).map(recoveryScore)
    return vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null
  }
  const thisWeekAvg = avg(last14.slice(7))
  const lastWeekAvg = avg(last14.slice(0, 7))

  const loads = weeklyLoads(data.sessions, mondayOf(t), 8)
  const maxLoad = Math.max(...loads.map(l => l.load), 1)

  const allAttempts = data.frees.flatMap(f => f.attempts)
  const acc = (days: number | null) => {
    const a = data.frees.filter(f => days === null || daysBetween(f.date, t) < days).flatMap(f => f.attempts)
    return a.length ? Math.round((a.filter(x => x.scored).length / a.length) * 100) : null
  }

  const testsWithData = [...new Set(data.benchmarks.map(b => b.test))] as BenchmarkTest[]

  return (
    <>
      <div className="large-title">
        <div className="eyebrow">Progress</div>
        <h1>How you're trending</h1>
      </div>
      <div className="card">
        <div className="grid3">
          <div className="center">
            <div className="row" style={{ justifyContent: 'center', gap: 4, color: 'var(--amber)' }}><Icon name="flame" size={22} stroke={2} /><span className="num" style={{ fontSize: 26, fontWeight: 800, color: 'var(--ink)' }}>{current}</span></div>
            <div className="tiny muted" style={{ fontWeight: 600 }}>Day streak</div>
          </div>
          <div className="center">
            <div className="num" style={{ fontSize: 26, fontWeight: 800 }}>{best}</div>
            <div className="tiny muted" style={{ fontWeight: 600 }}>Best streak</div>
          </div>
          <div className="center">
            <div className="num" style={{ fontSize: 26, fontWeight: 800 }}>{data.sessions.length}</div>
            <div className="tiny muted" style={{ fontWeight: 600 }}>Sessions</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="row between">
          <h2 style={{ margin: 0 }}>Recovery</h2>
          <span className="small muted">
            {thisWeekAvg ?? '—'} avg{lastWeekAvg !== null && thisWeekAvg !== null ? ` (${thisWeekAvg >= lastWeekAvg ? '▲' : '▼'} from ${lastWeekAvg})` : ''}
          </span>
        </div>
        <Bars values={rec} max={10} height={110} />
        <BarLabels labels={last14.map((d, i) => (i % 2 === 1 ? String(fromISO(d).getDate()) : ''))} />
      </div>

      <div className="card">
        <h2>Weekly training load</h2>
        <Bars
          values={loads.map((l, i) => {
            const prev = loads.slice(Math.max(0, i - 4), i).filter(x => x.load > 0)
            const avgPrev = prev.length ? prev.reduce((a, b) => a + b.load, 0) / prev.length : 0
            const spike = prev.length >= 3 && l.load > avgPrev * 1.5
            return { label: l.weekStart, value: l.load, color: spike ? 'var(--red)' : 'var(--accent)' }
          })}
          max={maxLoad}
          height={110}
        />
        <BarLabels labels={loads.map(l => fromISO(l.weekStart).toLocaleDateString('en-IE', { day: 'numeric', month: 'numeric' }))} />
        <div className="tiny muted" style={{ marginTop: 6 }}>Load = minutes × effort (RPE). Red = more than 50% above your recent average.</div>
      </div>

      <div className="card">
        <h2>Free-taking</h2>
        <div className="grid3">
          <div className="stat"><div className="v">{acc(7) ?? '—'}{acc(7) !== null && '%'}</div><div className="l">7 days</div></div>
          <div className="stat"><div className="v">{acc(30) ?? '—'}{acc(30) !== null && '%'}</div><div className="l">30 days</div></div>
          <div className="stat"><div className="v">{acc(null) ?? '—'}{acc(null) !== null && '%'}</div><div className="l">All time</div></div>
        </div>
      </div>
      {allAttempts.length > 0 && <ZoneTable attempts={allAttempts} />}

      {testsWithData.length > 0 && <Benchmarks tests={testsWithData} />}

      <NutritionProgress />

      <div className="section-label">Pro insights</div>
      <ProGate nav={nav} title="Readiness insights" icon="pulse" blurb="See what's dragging your recovery down (sleep, stress, soreness) and which days of the week you're least fresh.">
        <ReadinessInsights />
      </ProGate>
      <ProGate nav={nav} title="Strength tracker" icon="dumbbell" blurb="Estimated maxes and personal bests for every lift you log in the workout player.">
        <StrengthTracker />
      </ProGate>
      <ProGate nav={nav} title="Load ratio trend" icon="trend" blurb="Ten weeks of training-load spikes, so you can see injury risk building before it bites.">
        <LoadTrend />
      </ProGate>
      <ProGate nav={nav} title="Shot map" icon="ball" blurb="Every free you've logged on one pitch, with accuracy from the left, centre and right.">
        <FreesAnalytics />
      </ProGate>
    </>
  )
}

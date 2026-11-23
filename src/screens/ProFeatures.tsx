// Pro features: strength tracker, readiness insights, load trend, free-taking analytics.
import type { ReactNode } from 'react'
import type { Nav } from '../App'
import { usePro } from '../lib/account'
import { useStore } from '../lib/store'
import { addDays, DAY_SHORT, daysBetween, fromISO, mondayOf, prettyDate, today, weekday } from '../lib/dates'
import { recoveryScore } from '../lib/recovery'
import { loadInWindow } from '../lib/load'
import type { FreeAttempt } from '../lib/types'
import { Bars, BarLabels } from '../components/ui'
import { Icon } from '../components/Icon'
import { Pitch } from '../components/Pitch'

export function ProBadge() {
  return (
    <span className="pill" style={{ background: 'linear-gradient(135deg, #ffcc00, #ff9f0a)', color: '#3a2500' }}>
      <Icon name="star" size={11} stroke={2.6} /> PRO
    </span>
  )
}

/** Shows children for Pro players; a locked teaser for everyone else. */
export function ProGate({ nav, title, blurb, icon, children }: { nav: Nav; title: string; blurb: string; icon: string; children: ReactNode }) {
  const { pro } = usePro()
  if (pro) return <>{children}</>
  return (
    <button className="card" onClick={() => nav.open({ kind: 'pro' })} style={{ position: 'relative', overflow: 'hidden' }}>
      <div className="row between">
        <div className="row">
          <span className="cat-badge" style={{ width: 36, height: 36, background: 'linear-gradient(145deg, #ffcc00, #ff9f0a)' }}><Icon name={icon} size={20} stroke={2} /></span>
          <b style={{ fontSize: 17 }}>{title}</b>
        </div>
        <ProBadge />
      </div>
      <div className="small muted" style={{ marginTop: 10 }}>{blurb}</div>
      <div aria-hidden style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 6, alignItems: 'end', height: 56, marginTop: 14, filter: 'blur(3px)', opacity: 0.55 }}>
        {[40, 55, 48, 70, 62, 80, 74, 92].map((h, i) => <div key={i} style={{ height: `${h}%`, borderRadius: 5, background: 'var(--accent)' }} />)}
      </div>
      <div className="link small" style={{ marginTop: 12 }}>Unlock with Pro <Icon name="right" size={14} /></div>
    </button>
  )
}

// ---------- strength ----------

const e1rm = (kg: number, reps: number) => (reps <= 1 ? kg : kg * (1 + reps / 30))

export function StrengthTracker() {
  const { data } = useStore()
  const lifts = new Map<string, { name: string; points: { date: string; best: number; top: string }[] }>()
  for (const s of [...data.sessions].sort((a, b) => a.date.localeCompare(b.date))) {
    const byItem = new Map<string, { best: number; top: string; name: string }>()
    for (const l of s.sets ?? []) {
      if (!l.kg || !l.reps) continue
      const v = e1rm(l.kg, l.reps)
      const cur = byItem.get(l.itemId)
      if (!cur || v > cur.best) byItem.set(l.itemId, { best: v, top: `${l.kg}kg × ${l.reps}`, name: l.name })
    }
    for (const [id, v] of byItem) {
      if (!lifts.has(id)) lifts.set(id, { name: v.name, points: [] })
      lifts.get(id)!.points.push({ date: s.date, best: Math.round(v.best * 10) / 10, top: v.top })
    }
  }
  const list = [...lifts.values()].sort((a, b) => b.points.length - a.points.length).slice(0, 5)

  return (
    <div className="card">
      <div className="row between" style={{ marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Strength tracker</h2>
        <ProBadge />
      </div>
      {list.length === 0 && <div className="small muted">Log weights in the workout player and your estimated maxes appear here.</div>}
      <div className="stack">
        {list.map(l => {
          const first = l.points[0]
          const last = l.points[l.points.length - 1]
          const best = Math.max(...l.points.map(p => p.best))
          const change = Math.round((last.best - first.best) * 10) / 10
          return (
            <div key={l.name}>
              <div className="row between">
                <div>
                  <div style={{ fontWeight: 700 }}>{l.name}</div>
                  <div className="tiny muted">Last: {last.top} · {prettyDate(last.date)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="num" style={{ fontWeight: 800, fontSize: 20 }}>{Math.round(last.best)}<span className="tiny muted"> kg e1RM</span></div>
                  {l.points.length > 1 && <span className={`pill ${change >= 0 ? 'green' : 'amber'}`}>{change >= 0 ? '+' : ''}{change} kg</span>}
                </div>
              </div>
              <div style={{ marginTop: 8 }}>
                <Bars height={44} max={best} values={l.points.slice(-10).map(p => ({ label: p.date, value: p.best, color: p.best === best ? 'var(--green)' : 'var(--accent)' }))} />
              </div>
            </div>
          )
        })}
      </div>
      {list.length > 0 && <div className="tiny muted" style={{ marginTop: 12 }}>e1RM = estimated one-rep max from your best set (Epley formula). Green = your best.</div>}
    </div>
  )
}

// ---------- readiness insights ----------

export function ReadinessInsights() {
  const { data } = useStore()
  const t = today()
  const recent = data.checkins.filter(c => daysBetween(c.date, t) >= 0 && daysBetween(c.date, t) < 28)
  const avg = (f: (c: (typeof recent)[number]) => number) => (recent.length ? Math.round((recent.reduce((s, c) => s + f(c), 0) / recent.length) * 10) / 10 : 0)
  const parts = [
    { label: 'Sleep', v: avg(c => c.sleep), tip: 'Aim for a regular bedtime and 8+ hours before hard sessions.' },
    { label: 'Energy', v: avg(c => c.energy), tip: 'Low energy often means under-fuelling. Eat well around training.' },
    { label: 'Soreness', v: avg(c => 10 - c.soreness), tip: 'Spread hard leg days out and keep recovery days easy.' },
    { label: 'Stress', v: avg(c => 10 - c.stress), tip: 'Life stress counts as load. Go lighter in busy weeks.' },
    { label: 'Session effort', v: avg(c => 10 - c.rpe), tip: 'Your sessions are consistently hard. Make sure easy days are actually easy.' },
  ]
  const drag = [...parts].sort((a, b) => a.v - b.v)[0]
  const byDay = Array.from({ length: 7 }, (_, d) => {
    const vals = data.checkins.filter(c => weekday(c.date) === d).map(recoveryScore)
    return vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : 0
  })
  const worstDay = byDay.indexOf(Math.min(...byDay.filter(v => v > 0)))
  const consistency = Math.round((recent.length / 28) * 100)

  return (
    <div className="card">
      <div className="row between" style={{ marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Readiness insights</h2>
        <ProBadge />
      </div>
      {recent.length < 5 ? (
        <div className="small muted">Check in for at least 5 days to unlock your insights.</div>
      ) : (
        <div className="stack">
          <div className="small muted">What's shaping your score (last 28 days, higher is better)</div>
          {parts.map(p => (
            <div key={p.label} className="row" style={{ gap: 12 }}>
              <span className="small" style={{ width: 104, fontWeight: 600 }}>{p.label}</span>
              <div className="grow" style={{ height: 8, borderRadius: 4, background: 'var(--fill)', overflow: 'hidden' }}>
                <div style={{ width: `${p.v * 10}%`, height: '100%', borderRadius: 4, background: p === drag ? 'var(--amber)' : 'var(--accent)' }} />
              </div>
              <b className="small num" style={{ width: 30, textAlign: 'right' }}>{p.v}</b>
            </div>
          ))}
          <div className="banner amber"><Icon name="info" size={18} /><div><b>{drag.label}</b> is pulling your score down the most. {drag.tip}</div></div>
          <div className="hr" />
          <div className="small muted">Average readiness by day</div>
          <Bars height={70} max={10} values={byDay.map((v, i) => ({ label: DAY_SHORT[i], value: v, color: i === worstDay ? 'var(--amber)' : 'var(--accent)' }))} />
          <BarLabels labels={DAY_SHORT} />
          {worstDay >= 0 && <div className="small">You're usually least recovered on <b>{['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][worstDay]}s</b>. Keep that day light where you can.</div>}
          <div className="small muted">Check-in consistency: <b style={{ color: 'var(--ink)' }}>{consistency}%</b> of the last 28 days.</div>
        </div>
      )}
    </div>
  )
}

// ---------- load trend ----------

export function LoadTrend() {
  const { data } = useStore()
  const mon = mondayOf(today())
  const weeks = Array.from({ length: 10 }, (_, i) => addDays(mon, -7 * (9 - i)))
  const points = weeks.map(w => {
    const end = addDays(w, 6)
    const acute = loadInWindow(data.sessions, end, 7)
    const chronic = loadInWindow(data.sessions, end, 28) / 4
    return { w, ratio: chronic > 0 ? Math.round((acute / chronic) * 100) / 100 : 0 }
  })
  const color = (r: number) => (r > 1.5 ? 'var(--red)' : r > 1.3 ? 'var(--amber)' : r < 0.8 ? 'var(--muted)' : 'var(--green)')
  return (
    <div className="card">
      <div className="row between" style={{ marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Load ratio trend</h2>
        <ProBadge />
      </div>
      {points.every(p => p.ratio === 0) && <div className="small muted" style={{ marginBottom: 8 }}>Log your sessions for a few weeks and your load trend builds up here.</div>}
      <Bars height={90} max={2} values={points.map(p => ({ label: p.w, value: Math.min(2, p.ratio), color: color(p.ratio) }))} />
      <BarLabels labels={points.map(p => `${fromISO(p.w).getDate()}/${fromISO(p.w).getMonth() + 1}`)} />
      <div className="row wrap tiny muted" style={{ gap: 12, marginTop: 10 }}>
        <span><span style={{ color: 'var(--green)' }}>●</span> 0.8–1.3 sweet spot</span>
        <span><span style={{ color: 'var(--amber)' }}>●</span> 1.3–1.5 climbing</span>
        <span><span style={{ color: 'var(--red)' }}>●</span> 1.5+ spike</span>
      </div>
      <div className="tiny muted" style={{ marginTop: 6 }}>Each bar compares that week's load with your 4-week average. Big jumps are when soft-tissue injuries tend to happen.</div>
    </div>
  )
}

// ---------- free-taking analytics ----------

export function FreesAnalytics() {
  const { data } = useStore()
  const all: FreeAttempt[] = data.frees.flatMap(f => f.attempts)
  const pct = (xs: FreeAttempt[]) => (xs.length ? Math.round((xs.filter(a => a.scored).length / xs.length) * 100) : null)
  const sides = [
    { label: 'Left', xs: all.filter(a => a.x < -8) },
    { label: 'Centre', xs: all.filter(a => a.x >= -8 && a.x <= 8) },
    { label: 'Right', xs: all.filter(a => a.x > 8) },
  ]
  const kinds = [
    { label: 'Frees', xs: all.filter(a => a.kind === 'free') },
    { label: data.profile.sport === 'football' || data.profile.sport === 'lgfa' ? '45s' : '65s', xs: all.filter(a => a.kind === 'long') },
    { label: 'Sideline', xs: all.filter(a => a.kind === 'sideline') },
    { label: 'From play', xs: all.filter(a => a.kind === 'play') },
  ].filter(k => k.xs.length)
  const sessions = [...data.frees].sort((a, b) => a.date.localeCompare(b.date)).slice(-10)

  return (
    <div className="card">
      <div className="row between" style={{ marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Free-taking analysis</h2>
        <ProBadge />
      </div>
      {all.length === 0 ? (
        <div className="small muted">Log a free-taking session to see your shot map.</div>
      ) : (
        <div className="stack">
          <div className="small muted">Every shot you've logged ({all.length})</div>
          <Pitch sport={data.profile.sport} attempts={all} />
          <div className="grid3">
            {sides.map(s => (
              <div className="stat" key={s.label}>
                <div className="v">{pct(s.xs) ?? '—'}{pct(s.xs) !== null && '%'}</div>
                <div className="l">{s.label} · {s.xs.length}</div>
              </div>
            ))}
          </div>
          {kinds.length > 1 && (
            <div className="row wrap" style={{ gap: 8 }}>
              {kinds.map(k => <span key={k.label} className="pill grey">{k.label}: {pct(k.xs)}% ({k.xs.length})</span>)}
            </div>
          )}
          {sessions.length > 1 && (
            <>
              <div className="small muted">Accuracy, last {sessions.length} sessions</div>
              <Bars height={60} max={100} values={sessions.map(f => ({ label: f.date, value: pct(f.attempts) ?? 0 }))} />
            </>
          )}
        </div>
      )}
    </div>
  )
}

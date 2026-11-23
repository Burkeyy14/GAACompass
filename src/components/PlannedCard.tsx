import type { Nav } from '../App'
import { useStore } from '../lib/store'
import { today } from '../lib/dates'
import { readiness } from '../lib/recovery'
import { loadStatus } from '../lib/load'
import { adjustForReadiness, weekCtx, type TodayItem } from '../lib/generator'
import { GOALS } from '../lib/programs'
import { CatBadge, Icon } from './Icon'

/** A prescribed session, already adapted to today's check-in and load. */
export function PlannedCard({ item, nav, adapt = true }: { item: TodayItem; nav: Nav; adapt?: boolean }) {
  const { data } = useStore()
  const t = today()
  const checkin = data.checkins.find(c => c.date === t) ?? null
  const r = checkin ? readiness(checkin, data.checkins) : null
  const load = loadStatus(data.sessions, t)
  const ctx = weekCtx(item.goal, data.profile, item.week.week)
  const adj = adapt ? adjustForReadiness(item.session, r, checkin, load, ctx) : { action: 'go' as const, note: '', session: item.session }
  const s = adj.session
  const done = data.sessions.some(x => x.programRef === item.ref)
  const exercises = s.blocks.flatMap(b => b.items).filter(i => i.kind !== 'drill').length

  return (
    <div className="card">
      <div className="row top">
        <CatBadge cat={s.category} size={46} />
        <div className="grow">
          <div className="row between">
            <span className="tiny muted" style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>
              {GOALS[item.goal.type].short} · Week {item.week.week}
            </span>
            {done ? (
              <span className="pill green"><Icon name="check" size={12} stroke={3} /> Done</span>
            ) : adapt && checkin ? (
              <span className={`pill ${adj.action === 'go' ? 'green' : adj.action === 'reduce' ? 'amber' : 'red'}`}>
                {adj.action === 'go' ? 'As planned' : adj.action === 'reduce' ? 'Reduced' : 'Swapped'}
              </span>
            ) : null}
          </div>
          <div style={{ fontWeight: 700, fontSize: 18, letterSpacing: -0.3, marginTop: 2 }}>{s.title}</div>
          {adj.action === 'swap' && <div className="tiny muted">Instead of: {item.session.title}</div>}
          <div className="tiny muted" style={{ marginTop: 4 }}>
            <Icon name="timer" size={13} style={{ verticalAlign: -2 }} /> {s.minutes} min · {exercises} exercises · effort {s.targetRpe}/10
          </div>
        </div>
      </div>
      {adapt && adj.note && <div className="small" style={{ marginTop: 12, color: 'var(--ink-2)' }}>{adj.note}</div>}
      {!done && (
        <div className="row" style={{ marginTop: 14 }}>
          <button className="btn plain sm" onClick={() => nav.open({ kind: 'session', session: s, note: adj.action !== 'go' ? adj.note : undefined, ref: item.ref })}>
            Details
          </button>
          <button className="btn sm grow" style={{ height: 40 }} onClick={() => nav.start(s, item.ref, adj.action !== 'go' ? adj.note : undefined)}>
            <Icon name="play" size={15} /> Start session
          </button>
        </div>
      )}
    </div>
  )
}

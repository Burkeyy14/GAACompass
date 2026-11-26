import { useState } from 'react'
import type { Nav } from '../App'
import type { DayActivity } from '../lib/types'
import { useStore } from '../lib/store'
import { addDays, DAY_SHORT, fromISO, mondayOf, today } from '../lib/dates'
import { ACTIVITY_META, ACTIVITY_ORDER, planFeedback } from '../lib/load'
import { CATEGORY_ACTIVITY, sessionsForDate, sportForDay, suggestedWeekDays } from '../lib/generator'
import { Banner } from '../components/ui'
import { CatBadge, Icon } from '../components/Icon'

export function Planner({ nav }: { nav: Nav }) {
  const { data, put } = useStore()
  const [week, setWeek] = useState(mondayOf(today()))
  const [editing, setEditing] = useState<number | null>(null)
  const saved = data.weekPlans.find(w => w.weekStart === week)
  const days: DayActivity[][] = saved?.days ?? suggestedWeekDays(data.goals, data.profile, week)

  const fb = planFeedback(days, data.profile.sports?.length > 1)
  const isThisWeek = week === mondayOf(today())
  const fmt = (iso: string) => fromISO(iso).toLocaleDateString('en-IE', { day: 'numeric', month: 'short' })
  const bandColor = { under: 'var(--muted)', optimal: 'var(--green)', high: 'var(--amber)', overload: 'var(--red)' }[fb.band]

  function save(next: DayActivity[][]) {
    put('weekPlans', { id: week, weekStart: week, days: next })
  }

  function toggle(d: number, a: DayActivity) {
    const next = days.map((list, i) => {
      if (i !== d) return list
      if (a === 'rest') return list.includes('rest') ? [] : ['rest' as DayActivity]
      const without = list.filter(x => x !== 'rest')
      return without.includes(a) ? without.filter(x => x !== a) : [...without, a].slice(-3)
    })
    save(next)
  }

  return (
    <>
      <div className="large-title">
        <div className="eyebrow">{fmt(week)} – {fmt(addDays(week, 6))}</div>
        <h1>{isThisWeek ? 'This week' : week > mondayOf(today()) ? 'Upcoming week' : 'Past week'}</h1>
      </div>

      <div className="row between">
        <button className="icon-btn" onClick={() => { setWeek(addDays(week, -7)); setEditing(null) }} aria-label="Previous week"><Icon name="left" size={18} /></button>
        <button className="btn tonal sm" onClick={() => save(suggestedWeekDays(data.goals, data.profile, week))}>
          <Icon name="sparkle" size={16} /> Auto-plan week
        </button>
        <button className="icon-btn" onClick={() => { setWeek(addDays(week, 7)); setEditing(null) }} aria-label="Next week"><Icon name="right" size={18} /></button>
      </div>

      <div className="card">
        <div className="row" style={{ gap: 14 }}>
          <div className="grow">
            <div className="tiny muted" style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>Planned load</div>
            <div className="row" style={{ gap: 8, marginTop: 2 }}>
              <span className="num" style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.6 }}>{fb.score.toFixed(1)}</span>
              <span className="pill" style={{ background: `color-mix(in srgb, ${bandColor} 16%, transparent)`, color: bandColor }}>
                {{ under: 'Light', optimal: 'Balanced', high: 'High', overload: 'Overload' }[fb.band]}
              </span>
            </div>
            <div className="small muted" style={{ marginTop: 4 }}>{fb.headline}</div>
          </div>
        </div>
        <div style={{ marginTop: 12, height: 8, borderRadius: 4, background: 'var(--fill)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, width: `${Math.min(100, (fb.score / 16) * 100)}%`, borderRadius: 4, background: `linear-gradient(90deg, var(--green), ${bandColor})` }} />
        </div>
        <div className="row between tiny muted" style={{ marginTop: 4 }}><span>Light</span><span>Balanced</span><span>High</span><span>Overload</span></div>
      </div>

      {fb.flags.map(f => <Banner key={f.text} kind={f.level}>{f.text}</Banner>)}

      <div className="card flush">
        {days.map((list, d) => {
          const date = addDays(week, d)
          const goalSessions = sessionsForDate(data.goals, data.profile, date)
          const logged = data.sessions.filter(s => s.date === date)
          const doneActs = new Set(logged.map(s => CATEGORY_ACTIVITY[s.category]))
          const shown = list.length ? list : (['rest'] as DayActivity[])
          const daySport = sportForDay(data.profile, d)
          const SPORT_SHORT: Record<string, string> = { hurling: 'Hurling', football: 'Football', camogie: 'Camogie', lgfa: 'LGFA' }
          function actLabel(a: DayActivity): string {
            if (data.profile.sports?.length > 1 && daySport) {
              if (a === 'match') return `${SPORT_SHORT[daySport]} match`
              if (a === 'pitch') return `${SPORT_SHORT[daySport]} training`
            }
            return ACTIVITY_META[a].label
          }
          return (
            <div key={d} className={'day' + (date === today() ? ' today' : '')}>
              <div className="d">
                <b>{DAY_SHORT[d]}</b>
                <span>{fromISO(date).getDate()}</span>
              </div>
              <div className="grow stack sm">
                <div className="row wrap" style={{ gap: 6 }}>
                  {shown.map(a => (
                    <span key={a} className={'act' + (doneActs.has(a) ? ' done' : '')}>
                      <CatBadge cat={a} size={22} />
                      {actLabel(a)}
                      {doneActs.has(a) && <Icon name="check" size={14} stroke={3} className="tick" />}
                    </span>
                  ))}
                  <button className="add-act" aria-label="Edit day" onClick={() => setEditing(editing === d ? null : d)}>
                    <Icon name={editing === d ? 'check' : 'edit'} size={14} />
                  </button>
                </div>
                {goalSessions.map(g => (
                  <button key={g.ref} className="link small" style={{ justifyContent: 'flex-start' }} onClick={() => nav.open({ kind: 'session', session: g.session, ref: g.ref })}>
                    <Icon name={data.sessions.some(s => s.programRef === g.ref) ? 'check' : 'play'} size={13} /> {g.session.title}
                  </button>
                ))}
                {editing === d && (
                  <div className="chips" style={{ gap: 6, paddingTop: 4 }}>
                    {ACTIVITY_ORDER.map(a => (
                      <button key={a} className={'chip' + (list.includes(a) ? ' on' : '')} style={{ padding: '6px 11px', fontSize: 13 }} onClick={() => toggle(d, a)}>
                        {ACTIVITY_META[a].label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
      <div className="tiny muted center" style={{ padding: '0 12px' }}>
        A green tick means you've done it. Logged sessions and finished workouts are added here automatically. Tap the pencil to change a day.
      </div>
    </>
  )
}

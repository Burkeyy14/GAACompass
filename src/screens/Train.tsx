import { useEffect, useState } from 'react'
import type { Nav } from '../App'
import type { FreeAttempt, FreeKind } from '../lib/types'
import { useStore } from '../lib/store'
import { addDays, DAY_SHORT, mondayOf, prettyDate, today, uid, weekday } from '../lib/dates'
import { sessionLoad } from '../lib/load'
import { sessionsForDate } from '../lib/generator'
import { GOALS } from '../lib/programs'
import { ask, lsGet, lsSet } from '../lib/env'
import { Pitch, zoneStats, distance } from '../components/Pitch'
import { Banner } from '../components/ui'
import { CatBadge, Icon } from '../components/Icon'
import { PlannedCard } from '../components/PlannedCard'

export function Train({ nav }: { nav: Nav }) {
  const [tab, setTab] = useState<'workouts' | 'frees' | 'history'>('workouts')
  return (
    <>
      <div className="large-title">
        <div className="eyebrow">Train</div>
        <h1>{{ workouts: 'Workouts', frees: 'Free-taking', history: 'History' }[tab]}</h1>
      </div>
      <div className="seg">
        <button className={tab === 'workouts' ? 'on' : ''} onClick={() => setTab('workouts')}>Workouts</button>
        <button className={tab === 'frees' ? 'on' : ''} onClick={() => setTab('frees')}>Frees</button>
        <button className={tab === 'history' ? 'on' : ''} onClick={() => setTab('history')}>History</button>
      </div>
      {tab === 'workouts' && <Workouts nav={nav} />}
      {tab === 'frees' && <Frees />}
      {tab === 'history' && <History />}
    </>
  )
}

function Workouts({ nav }: { nav: Nav }) {
  const { data } = useStore()
  const t = today()
  const todays = sessionsForDate(data.goals, data.profile, t)
  const mon = mondayOf(t)
  const week = Array.from({ length: 7 }, (_, d) => addDays(mon, d))
    .filter(d => d !== t)
    .flatMap(d => sessionsForDate(data.goals, data.profile, d).map(i => ({ ...i, date: d })))
  const done = new Set(data.sessions.map(s => s.programRef).filter(Boolean))

  return (
    <>
      {todays.length > 0 ? (
        <>
          <div className="section-label">Today</div>
          {todays.map(i => <PlannedCard key={i.ref} item={i} nav={nav} />)}
        </>
      ) : (
        <div className="card tight small muted">
          {data.goals.some(g => g.active) ? 'No prescribed session today. Pick one from this week below if you want to move it.' : (
            <>Set a goal and your sessions show up here. <button className="link" onClick={() => nav.go('goals')}>Choose a goal</button></>
          )}
        </div>
      )}

      {week.length > 0 && (
        <>
          <div className="section-label">This week</div>
          <div className="card flush">
            <div className="list">
              {week.map(i => (
                <button key={i.ref} className="li" onClick={() => nav.open({ kind: 'session', session: i.session, ref: i.ref })}>
                  <CatBadge cat={i.session.category} size={36} />
                  <div className="grow">
                    <div className="title">{i.session.title}</div>
                    <div className="sub">{DAY_SHORT[weekday(i.date)]} · {i.session.minutes} min · {GOALS[i.goal.type].short}</div>
                  </div>
                  {done.has(i.ref) ? <span className="pill green"><Icon name="check" size={12} stroke={3} /></span> : <Icon name="right" size={18} className="chev" />}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="section-label">Log something else</div>
      <div className="grid3">
        {([['pitch', 'Club training'], ['match', 'Match'], ['gym', 'Other']] as const).map(([cat, label]) => (
          <button key={cat} className="card tight center" style={{ padding: 14 }} onClick={() => nav.open({ kind: 'log', prefill: { category: cat, title: cat === 'gym' ? 'Own gym session' : label, minutes: cat === 'match' ? 70 : cat === 'pitch' ? 75 : 50, rpe: cat === 'match' ? 8 : 6 } })}>
            <CatBadge cat={cat} size={38} />
            <div className="tiny" style={{ fontWeight: 700, marginTop: 8 }}>{label}</div>
          </button>
        ))}
      </div>
      <div className="tiny muted center">Everything you log is ticked off in your week plan and counts towards your training load.</div>
    </>
  )
}

const DRAFT = 'gaa-compass:frees-draft'

function Frees() {
  const { data, put, remove } = useStore()
  const [attempts, setAttempts] = useState<FreeAttempt[]>(() => {
    try {
      return JSON.parse(lsGet(DRAFT) ?? '[]')
    } catch {
      return []
    }
  })
  const [pending, setPending] = useState<{ x: number; y: number } | null>(null)
  const [kind, setKind] = useState<FreeKind>('free')
  const [showHelp, setShowHelp] = useState(() => lsGet('gaa-compass:frees-help') !== '1')

  useEffect(() => lsSet(DRAFT, JSON.stringify(attempts)), [attempts])

  const scored = attempts.filter(a => a.scored).length
  const pct = attempts.length ? Math.round((scored / attempts.length) * 100) : 0
  const longest = attempts.filter(a => a.scored).reduce((m, a) => Math.max(m, Math.round(distance(a))), 0)

  function record(s: boolean) {
    if (!pending) return
    setAttempts(a => [...a, { ...pending, scored: s, kind }])
    setPending(null)
  }

  const history = [...data.frees].sort((a, b) => b.date.localeCompare(a.date))
  const KINDS: { value: FreeKind; label: string }[] = [
    { value: 'free', label: 'Free' },
    { value: 'sideline', label: 'Sideline' },
    { value: 'play', label: 'Play' },
  ]

  return (
    <>
      {showHelp && (
        <Banner kind="info">
          Tap where you took the shot from, then mark it Score or Wide. The pitch runs out to your own 45 for long-range frees.{' '}
          <button className="link small" onClick={() => { lsSet('gaa-compass:frees-help', '1'); setShowHelp(false) }}>Got it</button>
        </Banner>
      )}

      <div className="grid3">
        <div className="stat"><div className="v">{scored}/{attempts.length}</div><div className="l">Scored</div></div>
        <div className="stat"><div className="v">{pct}%</div><div className="l">Accuracy</div></div>
        <div className="stat"><div className="v">{longest || '—'}{longest ? 'm' : ''}</div><div className="l">Longest</div></div>
      </div>

      <div className="seg">
        {KINDS.map(k => <button key={k.value} className={kind === k.value ? 'on' : ''} onClick={() => setKind(k.value)}>{k.label}</button>)}
      </div>

      <Pitch sport={data.profile.sport} attempts={attempts} pending={pending} onTap={(x, y) => setPending({ x, y })} />

      <div style={pending ? { position: 'sticky', bottom: 'calc(92px + env(safe-area-inset-bottom))', zIndex: 5 } : undefined}>
        {pending ? (
          <div className="grid2">
            <button className="btn lg" style={{ background: 'var(--green)', color: '#fff', boxShadow: '0 10px 24px -10px var(--green)' }} onClick={() => record(true)}>
              <Icon name="check" size={20} stroke={2.6} /> Score
            </button>
            <button className="btn lg" style={{ background: 'var(--red)', color: '#fff', boxShadow: '0 10px 24px -10px var(--red)' }} onClick={() => record(false)}>
              <Icon name="x" size={20} stroke={2.6} /> Wide
            </button>
          </div>
        ) : (
          <div className="grid2">
            <button className="btn glassy" disabled={!attempts.length} onClick={() => setAttempts(a => a.slice(0, -1))}><Icon name="undo" size={18} /> Undo</button>
            <button className="btn" disabled={!attempts.length} onClick={() => { put('frees', { id: uid(), date: today(), attempts }); setAttempts([]) }}>Save session</button>
          </div>
        )}
      </div>

      {attempts.length > 0 && <ZoneTable attempts={attempts} title="This session by distance" />}

      <div className="section-label">Past sessions</div>
      <div className="card flush">
        <div className="list">
          {history.length === 0 && <div className="li no-icon small muted">Nothing logged yet.</div>}
          {history.map(f => {
            const s = f.attempts.filter(a => a.scored).length
            const p = f.attempts.length ? Math.round((s / f.attempts.length) * 100) : 0
            return (
              <div className="li no-icon" key={f.id}>
                <div className="grow">
                  <div className="title">{prettyDate(f.date)}</div>
                  <div className="sub">{s} of {f.attempts.length} scored</div>
                </div>
                <b className="num" style={{ fontSize: 18 }}>{p}%</b>
                <button className="icon-btn" style={{ width: 32, height: 32, background: 'none' }} aria-label="Delete" onClick={() => ask('Delete this session?') && remove('frees', f.id)}>
                  <Icon name="trash" size={16} />
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

export function ZoneTable({ attempts, title = 'Accuracy by distance' }: { attempts: FreeAttempt[]; title?: string }) {
  return (
    <div className="card">
      <h2>{title}</h2>
      <div className="stack sm">
        {zoneStats(attempts).map(z => (
          <div key={z.label} className="row" style={{ gap: 12 }}>
            <span className="small" style={{ width: 78, fontWeight: 600 }}>{z.label}</span>
            <div className="grow" style={{ height: 8, borderRadius: 4, background: 'var(--fill)', overflow: 'hidden' }}>
              <div style={{ width: `${z.pct ?? 0}%`, height: '100%', borderRadius: 4, background: z.pct === null ? 'transparent' : z.pct >= 70 ? 'var(--green)' : z.pct >= 50 ? 'var(--amber)' : 'var(--red)' }} />
            </div>
            <span className="small num muted" style={{ width: 44, textAlign: 'right' }}>{z.scored}/{z.attempts}</span>
            <b className="small num" style={{ width: 40, textAlign: 'right' }}>{z.pct === null ? '—' : `${z.pct}%`}</b>
          </div>
        ))}
      </div>
    </div>
  )
}

function History() {
  const { data, remove } = useStore()
  const [open, setOpen] = useState<string | null>(null)
  const list = [...data.sessions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 80)
  if (!list.length) return <div className="card tight small muted">No sessions yet. Start a workout or log your club training.</div>
  return (
    <div className="card flush">
      <div className="list">
        {list.map(s => (
          <div key={s.id}>
            <button className="li" onClick={() => setOpen(open === s.id ? null : s.id)}>
              <CatBadge cat={s.category} size={36} />
              <div className="grow">
                <div className="title">{s.title}</div>
                <div className="sub">{prettyDate(s.date)} · {s.minutes} min · RPE {s.rpe}{s.sets?.length ? ` · ${s.sets.length} sets` : ''}</div>
              </div>
              <div className="center">
                <b className="num">{sessionLoad(s)}</b>
                <div className="tiny muted">load</div>
              </div>
            </button>
            {open === s.id && (
              <div style={{ padding: '0 16px 14px 64px' }} className="stack sm">
                {s.sets?.length ? (
                  Object.values(
                    s.sets.reduce<Record<string, { name: string; parts: string[] }>>((m, l) => {
                      m[l.itemId] ??= { name: l.name, parts: [] }
                      m[l.itemId].parts.push(l.kg ? `${l.kg}kg×${l.reps}` : l.reps ? `${l.reps}` : l.seconds ? `${l.seconds}s` : '✓')
                      return m
                    }, {}),
                  ).map(x => (
                    <div key={x.name} className="small"><b>{x.name}</b> <span className="muted">{x.parts.join(' · ')}</span></div>
                  ))
                ) : (
                  <div className="small muted">{s.notes || 'No set details.'}</div>
                )}
                <button className="link small" style={{ color: 'var(--red)' }} onClick={() => ask('Delete this session?') && remove('sessions', s.id)}>
                  <Icon name="trash" size={14} /> Delete
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

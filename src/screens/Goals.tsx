import { useMemo, useState } from 'react'
import type { Nav } from '../App'
import type { BenchmarkTest, Equipment, Goal, GoalType, Phase } from '../lib/types'
import { useStore } from '../lib/store'
import { usePro } from '../lib/account'
import { addDays, DAY_SHORT, mondayOf, prettyDate, today, uid } from '../lib/dates'
import { ask } from '../lib/env'
import { athleteFrom, BENCHMARKS, GOALS, maxExtraSessions, personalNotes, PHASE_LABEL, POSITION_GOALS, POSITION_LABEL } from '../lib/programs'
import { currentWeekIndex, generatePlan } from '../lib/generator'
import { Banner, Chips, Sheet, Stepper } from '../components/ui'
import { CatBadge, GOAL_ICON, GOAL_TINT, Icon } from '../components/Icon'
import { PHASES } from './ProfileForm'

function GoalIcon({ type, size = 46 }: { type: GoalType; size?: number }) {
  return (
    <span className="gi cat-badge" style={{ width: size, height: size, borderRadius: size * 0.3, background: `linear-gradient(145deg, ${GOAL_TINT[type]}, ${GOAL_TINT[type]}bb)` }}>
      <Icon name={GOAL_ICON[type]} size={size * 0.52} stroke={2} />
    </span>
  )
}

export function Goals({ nav }: { nav: Nav }) {
  const { data, put, remove } = useStore()
  const { pro } = usePro()
  const [creating, setCreating] = useState(false)
  const active = data.goals.filter(g => g.active)
  const past = data.goals.filter(g => !g.active)
  const canAdd = pro || active.length === 0

  return (
    <>
      <div className="large-title">
        <div className="eyebrow">Goals</div>
        <h1>{active.length ? 'Your plan' : 'What do you want to improve?'}</h1>
      </div>

      {active.length === 0 && <GoalPicker onPick={() => setCreating(true)} />}

      {active.map(g => <GoalPlan key={g.id} goal={g} nav={nav} onEnd={() => put('goals', { ...g, active: false })} />)}

      {active.length > 0 && (
        <button className="btn glassy block" onClick={() => (canAdd ? setCreating(true) : nav.open({ kind: 'pro' }))}>
          <Icon name="plus" size={18} /> Add another goal {canAdd ? '' : '· Pro'}
        </button>
      )}

      {past.length > 0 && (
        <>
          <div className="section-label">Past goals</div>
          <div className="card flush">
            <div className="list">
              {past.map(g => (
                <div className="li" key={g.id}>
                  <GoalIcon type={g.type} size={34} />
                  <div className="grow">
                    <div className="title">{GOALS[g.type].title}</div>
                    <div className="sub">Started {prettyDate(g.startDate)}</div>
                  </div>
                  <button className="btn tonal sm" onClick={() => (canAdd ? put('goals', { ...g, active: true }) : nav.open({ kind: 'pro' }))}>Resume</button>
                  <button className="icon-btn" style={{ width: 32, height: 32, background: 'none' }} onClick={() => ask('Delete this goal?') && remove('goals', g.id)} aria-label="Delete">
                    <Icon name="trash" size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {creating && (
        <Sheet onClose={() => setCreating(false)} title="New goal">
          <NewGoal onDone={g => { put('goals', g); setCreating(false) }} />
        </Sheet>
      )}
    </>
  )
}

function GoalPicker({ onPick }: { onPick: () => void }) {
  const { data } = useStore()
  const rec = POSITION_GOALS[data.profile.position]
  return (
    <>
      <div className="small muted" style={{ padding: '0 4px' }}>
        Pick a goal and you get a week-by-week plan built around your club training and matches. It adjusts every day to how you feel.
      </div>
      <button className="btn block lg" onClick={onPick}><Icon name="plus" size={18} /> Set a goal</button>
      {rec.length > 0 && (
        <div className="small muted" style={{ padding: '0 4px' }}>
          Suggested for the {POSITION_LABEL[data.profile.position].toLowerCase()}: <b style={{ color: 'var(--ink)' }}>{rec.map(r => GOALS[r].short).join(', ')}</b>
        </div>
      )}
    </>
  )
}

function NewGoal({ onDone }: { onDone: (g: Goal) => void }) {
  const { data } = useStore()
  const athlete = athleteFrom(data.profile)
  const rec = POSITION_GOALS[data.profile.position]
  const [type, setType] = useState<GoalType | null>(null)
  const [weeks, setWeeks] = useState(8)
  const [phase, setPhase] = useState<Phase>(data.profile.phase)
  const [extra, setExtra] = useState(2)
  const [equipment, setEquipment] = useState<Equipment>('gym')
  const thisMon = mondayOf(today())
  const [start, setStart] = useState(thisMon)
  const max = maxExtraSessions(phase, athlete)
  const n = Math.min(extra, max)

  const draft: Goal | null = type ? { id: uid(), type, startDate: start, weeks, extraSessions: n, equipment, phase, active: true, createdAt: today() } : null
  const preview = useMemo(() => (draft ? generatePlan(draft, data.profile)[0] : null), [type, weeks, phase, n, equipment, start, data.profile]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!type) {
    const order = [...rec, ...(Object.keys(GOALS) as GoalType[]).filter(g => !rec.includes(g))]
    return (
      <div className="stack sm">
        {order.map(k => (
          <button key={k} className={'goal-tile' + (rec.includes(k) ? ' rec' : '')} onClick={() => { setType(k); setWeeks(GOALS[k].defaultWeeks) }}>
            <GoalIcon type={k} />
            <span className="grow">
              <span className="row" style={{ gap: 8 }}>
                <b style={{ fontSize: 16 }}>{GOALS[k].title}</b>
                {rec.includes(k) && <span className="pill accent">For your position</span>}
              </span>
              <div className="small muted" style={{ marginTop: 2 }}>{GOALS[k].blurb}</div>
            </span>
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="stack">
      <div className="row">
        <button className="icon-btn" onClick={() => setType(null)} aria-label="Back"><Icon name="left" size={18} /></button>
        <GoalIcon type={type} size={38} />
        <h3 className="grow" style={{ fontSize: 19 }}>{GOALS[type].title}</h3>
      </div>
      {type === 'hamstring' && (
        <Banner kind="amber">This plan is for <b>preventing</b> hamstring injuries. If you have a strain now, follow your physio's return-to-play plan first and start this once you're cleared.</Banner>
      )}
      <div className="card stack">
        <div className="field">Season phase<Chips options={PHASES} value={phase} onChange={setPhase} /></div>
        <div className="field">
          Extra sessions a week, on top of club training
          <Stepper value={n} onChange={v => setExtra(Math.max(1, Math.min(v, max)))} min={1} />
          <span className="tiny" style={{ fontWeight: 500 }}>Up to {max} for you in {PHASE_LABEL[phase].toLowerCase()}, based on your age and level.</span>
        </div>
        <div className="field">Length<Chips options={[4, 6, 8, 12].map(v => ({ value: v, label: `${v} weeks` }))} value={weeks} onChange={setWeeks} /></div>
        <div className="field">Equipment<Chips<Equipment> options={[{ value: 'gym', label: 'Gym access' }, { value: 'minimal', label: 'Minimal / home' }]} value={equipment} onChange={setEquipment} /></div>
        <div className="field">Start<Chips options={[{ value: thisMon, label: 'This week' }, { value: addDays(thisMon, 7), label: 'Next Monday' }]} value={start} onChange={setStart} /></div>
      </div>

      {preview && (
        <div className="card flush">
          <div style={{ padding: '12px 16px 0' }}>
            <h3>Your first week</h3>
            <div className="tiny muted" style={{ marginTop: 2 }}>
              Placed around club nights ({data.profile.clubTrainingDays.map(d => DAY_SHORT[d]).join(', ') || 'none'}) and matches ({data.profile.matchDay === null ? 'none' : DAY_SHORT[data.profile.matchDay]})
            </div>
          </div>
          <div className="list">
            {preview.sessions.map(s => (
              <div className="li" key={s.session.key}>
                <CatBadge cat={s.session.category} size={34} />
                <div className="grow">
                  <div className="title">{s.session.title}</div>
                  <div className="sub">{DAY_SHORT[s.day]} · {s.session.minutes} min</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <button className="btn block lg" onClick={() => draft && onDone(draft)}>Start this plan</button>
    </div>
  )
}

function GoalPlan({ goal, nav, onEnd }: { goal: Goal; nav: Nav; onEnd: () => void }) {
  const { data } = useStore()
  const def = GOALS[goal.type]
  const plan = generatePlan(goal, data.profile)
  const cur = currentWeekIndex(goal, today())
  const done = new Set(data.sessions.map(s => s.programRef).filter(Boolean))
  const total = plan.reduce((t, w) => t + w.sessions.length, 0)
  const completed = plan.reduce((t, w) => t + w.sessions.filter(s => done.has(`${goal.id}:${w.week}:${s.session.key}`)).length, 0)
  const notes = personalNotes(athleteFrom(data.profile), data.profile)
  const [showNotes, setShowNotes] = useState(false)

  return (
    <div className="stack">
      <div className="card">
        <div className="row" style={{ gap: 14 }}>
          <GoalIcon type={goal.type} size={52} />
          <div className="grow">
            <div style={{ fontWeight: 750, fontSize: 20, letterSpacing: -0.4 }}>{def.title}</div>
            <div className="tiny muted">{PHASE_LABEL[goal.phase]} · {goal.extraSessions}×/week · {goal.equipment === 'gym' ? 'Gym' : 'Minimal kit'}</div>
          </div>
          <span className="pill accent">{cur ? `Week ${cur}/${goal.weeks}` : today() < goal.startDate ? 'Starts Monday' : 'Finished'}</span>
        </div>
        <div style={{ height: 8, background: 'var(--fill)', borderRadius: 4, marginTop: 14, overflow: 'hidden' }}>
          <div style={{ width: `${(completed / Math.max(1, total)) * 100}%`, height: '100%', background: `linear-gradient(90deg, ${GOAL_TINT[goal.type]}, var(--accent))`, borderRadius: 4 }} />
        </div>
        <div className="row between tiny muted" style={{ marginTop: 6 }}>
          <span>{completed} of {total} sessions</span>
          {notes.length > 0 && (
            <button className="link tiny" onClick={() => setShowNotes(x => !x)}><Icon name="user" size={13} /> Tailored to you</button>
          )}
        </div>
        {showNotes && (
          <div className="stack sm" style={{ marginTop: 10 }}>
            {notes.map(n => <div key={n} className="small row top" style={{ gap: 8 }}><Icon name="check" size={16} stroke={2.4} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }} />{n}</div>)}
          </div>
        )}
      </div>

      {plan.map(w => (
        <details key={w.week} className="week" open={w.week === cur}>
          <summary>
            <div>
              <div className="row" style={{ gap: 8 }}>
                <b>Week {w.week}</b>
                {w.week === cur && <span className="pill accent">Now</span>}
                {w.deload && <span className="pill grey">Deload</span>}
              </div>
              <div className="tiny muted" style={{ marginTop: 2 }}>{w.theme}</div>
            </div>
            <div className="row">
              <span className="tiny muted">{w.sessions.filter(s => done.has(`${goal.id}:${w.week}:${s.session.key}`)).length}/{w.sessions.length}</span>
              <Icon name="down" size={18} className="chev" />
            </div>
          </summary>
          <div className="list" style={{ paddingBottom: 6 }}>
            {w.testWeek && def.tests.length > 0 && (
              <div style={{ padding: '0 16px 8px' }}><Banner kind="info" icon="ruler">Test week: record {def.tests.map(t => BENCHMARKS[t].label).join(', ')} below.</Banner></div>
            )}
            {w.sessions.map(s => {
              const ref = `${goal.id}:${w.week}:${s.session.key}`
              return (
                <button key={ref} className="li" onClick={() => nav.open({ kind: 'session', session: s.session, ref })}>
                  <CatBadge cat={s.session.category} size={34} />
                  <div className="grow">
                    <div className="title">{s.session.title}</div>
                    <div className="sub">{DAY_SHORT[s.day]} · {s.session.minutes} min</div>
                  </div>
                  {done.has(ref) ? <span className="pill green"><Icon name="check" size={12} stroke={3} /></span> : <Icon name="right" size={18} className="chev" />}
                </button>
              )
            })}
          </div>
        </details>
      ))}

      {def.tests.length > 0 && <Benchmarks tests={def.tests} since={goal.startDate} />}
      <button className="link small" style={{ alignSelf: 'center', color: 'var(--muted)' }} onClick={() => ask('End this goal? Your history is kept.') && onEnd()}>End this goal</button>
    </div>
  )
}

export function Benchmarks({ tests, since }: { tests: BenchmarkTest[]; since?: string }) {
  const { data, put, remove } = useStore()
  const [adding, setAdding] = useState<BenchmarkTest | null>(null)
  const [value, setValue] = useState('')

  function freesPct(fromISO?: string) {
    const fr = data.frees.filter(f => !fromISO || f.date >= fromISO).flatMap(f => f.attempts)
    return fr.length ? Math.round((fr.filter(a => a.scored).length / fr.length) * 100) : null
  }

  return (
    <>
      <div className="section-label">Benchmarks</div>
      <div className="card flush">
        <div className="list">
          {tests.map(t => {
            const meta = BENCHMARKS[t]
            if (t === 'freesPct') {
              return (
                <div className="li" key={t}>
                  <span className="cat-badge" style={{ width: 34, height: 34, background: GOAL_TINT.frees }}><Icon name="goal" size={18} stroke={2} /></span>
                  <div className="grow title">{meta.label}</div>
                  <b className="num">{freesPct(since) ?? '—'}%</b>
                </div>
              )
            }
            const results = data.benchmarks.filter(b => b.test === t).sort((a, b) => a.date.localeCompare(b.date))
            const first = results[0]
            const last = results[results.length - 1]
            const change = first && last && first !== last ? Math.round((last.value - first.value) * 100) / 100 : null
            const better = change !== null && (meta.lowerIsBetter ? change < 0 : change > 0)
            return (
              <div key={t}>
                <div className="li">
                  <span className="cat-badge" style={{ width: 34, height: 34, background: 'linear-gradient(145deg, #8e8e93, #636366)' }}><Icon name="ruler" size={18} stroke={2} /></span>
                  <div className="grow">
                    <div className="title">{meta.label}</div>
                    <div className="sub">
                      {last ? <>Latest <b className="num" style={{ color: 'var(--ink)' }}>{last.value}{meta.unit}</b> · {prettyDate(last.date)}</> : meta.how}
                    </div>
                  </div>
                  {change !== null && <span className={`pill ${better ? 'green' : 'amber'}`}>{change > 0 ? '+' : ''}{change}{meta.unit}</span>}
                  <button className="icon-btn" style={{ width: 34, height: 34 }} onClick={() => { setAdding(adding === t ? null : t); setValue('') }} aria-label="Add result">
                    <Icon name={adding === t ? 'x' : 'plus'} size={16} stroke={2.2} />
                  </button>
                </div>
                {adding === t && (
                  <div className="stack sm" style={{ padding: '0 16px 14px 62px' }}>
                    <div className="tiny muted">{meta.how}</div>
                    <div className="row">
                      <div className="unit-input grow">
                        <input type="number" step="0.01" inputMode="decimal" value={value} onChange={e => setValue(e.target.value)} autoFocus />
                        <span>{meta.unit}</span>
                      </div>
                      <button className="btn sm" style={{ height: 46 }} disabled={!value} onClick={() => { put('benchmarks', { id: uid(), date: today(), test: t, value: Number(value) }); setAdding(null) }}>Save</button>
                    </div>
                    {results.length > 0 && (
                      <div className="chips">
                        {results.slice(-6).map(r => (
                          <button key={r.id} className="chip" style={{ fontSize: 12, padding: '5px 10px' }} onClick={() => ask(`Delete ${r.value}${meta.unit} from ${prettyDate(r.date)}?`) && remove('benchmarks', r.id)}>
                            {r.value}{meta.unit} · {prettyDate(r.date)} <Icon name="x" size={11} />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

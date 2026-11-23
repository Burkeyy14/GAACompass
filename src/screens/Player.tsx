// Full-screen guided workout: set-by-set with rest timers, weights and reps.
import { useEffect, useMemo, useRef, useState } from 'react'
import type { SetLog } from '../lib/types'
import type { Item, ProgramSession } from '../lib/programs'
import { restLabel, rx } from '../lib/programs'
import { useStore } from '../lib/store'
import { today, uid } from '../lib/dates'
import { ask } from '../lib/env'
import { Icon, CatBadge } from '../components/Icon'
import { Slider, Stepper, Banner } from '../components/ui'

interface Step {
  block: string
  item: Item
  set: number // 1-based
}

function buildSteps(s: ProgramSession): Step[] {
  const out: Step[] = []
  for (const b of s.blocks) for (const item of b.items) for (let set = 1; set <= (item.kind === 'drill' ? 1 : item.sets); set++) out.push({ block: b.name, item, set })
  return out
}

function beep() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new Ctx()
    ;[0, 0.18, 0.36].forEach((t, i) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.frequency.value = i === 2 ? 1175 : 880
      g.gain.setValueAtTime(0.0001, ctx.currentTime + t)
      g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + t + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.15)
      o.connect(g).connect(ctx.destination)
      o.start(ctx.currentTime + t)
      o.stop(ctx.currentTime + t + 0.16)
    })
    navigator.vibrate?.([120, 60, 120])
  } catch {
    /* audio not available */
  }
}

const fmt = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.max(0, Math.floor(sec % 60))).padStart(2, '0')}`

export function Player({ session, programRef, note, onClose }: { session: ProgramSession; programRef?: string; note?: string; onClose: () => void }) {
  const { data, logSession } = useStore()
  const steps = useMemo(() => buildSteps(session), [session])
  const [idx, setIdx] = useState(0)
  const [phase, setPhase] = useState<'work' | 'rest' | 'finish'>('work')
  const [restEnd, setRestEnd] = useState(0)
  const [holdEnd, setHoldEnd] = useState(0)
  const [logs, setLogs] = useState<SetLog[]>([])
  const [now, setNow] = useState(Date.now())
  const [rpe, setRpe] = useState(session.targetRpe)
  const [notes, setNotes] = useState('')
  const started = useRef(Date.now())

  // remembered weights: last time this exercise was logged
  const lastKg = useMemo(() => {
    const m: Record<string, number> = {}
    for (const s of [...data.sessions].sort((a, b) => a.date.localeCompare(b.date))) for (const l of s.sets ?? []) if (l.kg) m[l.itemId] = l.kg
    return m
  }, [data.sessions])

  const step = steps[idx]
  const isWeighted = session.category === 'gym' && step?.item.kind === 'reps' && (step.item.startKg !== undefined || lastKg[step.item.id] !== undefined)
  const [kg, setKg] = useState(0)
  const [reps, setReps] = useState(0)

  useEffect(() => {
    if (!step) return
    const prev = logs.filter(l => l.itemId === step.item.id).pop()
    setKg(prev?.kg ?? lastKg[step.item.id] ?? step.item.startKg ?? 0)
    setReps(prev?.reps ?? step.item.reps ?? 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx])

  // clock
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(t)
  }, [])

  // keep the screen on during the workout
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null
    const nav = navigator as unknown as { wakeLock?: { request: (t: string) => Promise<{ release: () => Promise<void> }> } }
    nav.wakeLock?.request('screen').then(l => (lock = l)).catch(() => {})
    return () => void lock?.release().catch(() => {})
  }, [])

  // rest finished
  useEffect(() => {
    if (phase === 'rest' && now >= restEnd) {
      beep()
      setPhase('work')
    }
  }, [now, phase, restEnd])

  // hold finished
  useEffect(() => {
    if (holdEnd && now >= holdEnd) {
      setHoldEnd(0)
      beep()
      complete()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, holdEnd])

  function complete() {
    const it = step.item
    if (it.kind !== 'drill') {
      setLogs(l => [
        ...l,
        { itemId: it.id, name: it.name, set: step.set, reps: it.kind === 'reps' ? reps : undefined, kg: isWeighted && kg ? kg : undefined, seconds: it.kind === 'hold' ? it.seconds : undefined },
      ])
    }
    if (idx + 1 >= steps.length) {
      setPhase('finish')
      return
    }
    setIdx(idx + 1)
    if (it.restSec > 0) {
      setRestEnd(Date.now() + it.restSec * 1000)
      setPhase('rest')
    }
  }

  function save() {
    const minutes = Math.max(5, Math.round((Date.now() - started.current) / 60000))
    logSession({ id: uid(), date: today(), category: session.category, title: session.title, minutes, rpe, notes: notes || undefined, sets: logs, programRef })
    onClose()
  }

  const elapsed = (now - started.current) / 1000
  const progress = phase === 'finish' ? 1 : idx / steps.length
  const setsOfItem = step ? (step.item.kind === 'drill' ? 1 : step.item.sets) : 1
  const next = steps[idx]

  return (
    <div className="player">
      <div className="ambient"><i /><i /><i /></div>
      <div className="player-inner">
        <div className="row between">
          <button
            className="icon-btn"
            aria-label="Close"
            onClick={() => {
              if (phase === 'finish' || logs.length === 0) return onClose()
              if (ask('Finish early? You can save what you have done so far.')) setPhase('finish')
            }}
          >
            <Icon name="x" size={18} stroke={2.2} />
          </button>
          <div className="center">
            <div className="tiny muted" style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{session.title}</div>
            <div className="num" style={{ fontWeight: 700 }}>{fmt(elapsed)}</div>
          </div>
          <CatBadge cat={session.category} size={40} />
        </div>
        <div className="progress-track"><div style={{ width: `${progress * 100}%` }} /></div>
        {note && idx === 0 && phase === 'work' && <Banner kind="amber">{note}</Banner>}

        {phase === 'rest' && next && (
          <div className="stack" style={{ flex: 1, justifyContent: 'center', alignItems: 'center', textAlign: 'center', gap: 20 }}>
            <div className="tiny muted" style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Rest</div>
            <RestRing remaining={(restEnd - now) / 1000} total={steps[idx - 1]?.item.restSec ?? 60} />
            <div className="row">
              <button className="btn plain sm" onClick={() => setRestEnd(e => e + 15000)}>+15s</button>
              <button className="btn tonal sm" onClick={() => setPhase('work')}><Icon name="skip" size={16} /> Skip rest</button>
            </div>
            <div className="card tight" style={{ width: '100%', textAlign: 'left' }}>
              <div className="tiny muted" style={{ fontWeight: 700, textTransform: 'uppercase' }}>Up next</div>
              <div style={{ fontWeight: 700, marginTop: 2 }}>{next.item.name}</div>
              <div className="small muted">Set {next.set} of {next.item.kind === 'drill' ? 1 : next.item.sets} · {rx(next.item)}</div>
            </div>
          </div>
        )}

        {phase === 'work' && step && (
          <div className="stack" style={{ flex: 1, justifyContent: 'center', gap: 18 }}>
            <div className="center">
              <div className="tiny muted" style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>{step.block}</div>
              <h1 style={{ margin: '6px 0 4px', fontSize: 28, letterSpacing: -0.6, lineHeight: 1.15 }}>{step.item.name}</h1>
              {step.item.cue && <div className="small muted">{step.item.cue}</div>}
            </div>

            {step.item.kind !== 'drill' && (
              <div className="set-dots">
                {Array.from({ length: setsOfItem }, (_, i) => (
                  <span key={i} className={i + 1 < step.set ? 'done' : i + 1 === step.set ? 'now' : ''} />
                ))}
              </div>
            )}

            <div className="card center">
              <div className="tiny muted" style={{ fontWeight: 700, textTransform: 'uppercase' }}>
                {step.item.kind === 'drill' ? 'Do' : `Set ${step.set} of ${setsOfItem}`}
              </div>
              <div className="big-number" style={{ marginTop: 6, fontSize: step.item.kind === 'drill' ? 30 : 64, letterSpacing: step.item.kind === 'drill' ? -0.5 : -2 }}>
                {step.item.kind === 'sprint' && `${step.item.distance}m`}
                {step.item.kind === 'reps' && `${step.item.reps}${step.item.perSide ? '' : ''}`}
                {step.item.kind === 'hold' && (holdEnd ? fmt((holdEnd - now) / 1000) : fmt(step.item.seconds ?? 0))}
                {step.item.kind === 'drill' && step.item.text}
              </div>
              <div className="small muted" style={{ marginTop: 4 }}>
                {step.item.kind === 'reps' && (step.item.perSide ? 'reps each side' : 'reps')}
                {step.item.kind === 'sprint' && 'sprint at full effort unless stated'}
                {step.item.kind === 'hold' && (step.item.perSide ? 'hold each side' : 'hold')}
              </div>
              {step.item.load && <div className="pill accent" style={{ marginTop: 10 }}>{step.item.load}</div>}
              {step.item.restSec > 0 && idx + 1 < steps.length && <div className="tiny muted" style={{ marginTop: 8 }}>then {restLabel(step.item.restSec)}</div>}
            </div>

            {isWeighted && (
              <div className="grid2">
                <div className="field">Weight<Stepper value={kg} onChange={setKg} step={2.5} unit="kg" /></div>
                <div className="field">Reps done<Stepper value={reps} onChange={setReps} unit={step.item.perSide ? '/side' : ''} /></div>
              </div>
            )}
            {!isWeighted && step.item.kind === 'reps' && session.category !== 'skills' && (
              <div className="field">Reps done<Stepper value={reps} onChange={setReps} unit={step.item.perSide ? '/side' : ''} /></div>
            )}

            <div style={{ marginTop: 'auto' }} className="stack">
              {step.item.kind === 'hold' && !holdEnd ? (
                <div className="grid2">
                  <button className="btn plain lg" onClick={complete}>Done</button>
                  <button className="btn lg" onClick={() => setHoldEnd(Date.now() + (step.item.seconds ?? 30) * 1000)}>
                    <Icon name="timer" size={20} /> Start timer
                  </button>
                </div>
              ) : (
                <button className="btn block lg" onClick={complete}>
                  <Icon name="check" size={20} stroke={2.4} /> {step.item.kind === 'drill' ? 'Done' : idx + 1 >= steps.length ? 'Finish' : 'Set done'}
                </button>
              )}
              <div className="row between">
                <button className="link small" disabled={idx === 0} onClick={() => { setIdx(Math.max(0, idx - 1)); setLogs(l => l.slice(0, -1)) }}>
                  <Icon name="left" size={16} /> Back
                </button>
                <button className="link small" onClick={() => { const nextItem = steps.findIndex((s, i) => i > idx && s.item.id !== step.item.id); nextItem === -1 ? setPhase('finish') : setIdx(nextItem) }}>
                  Skip exercise <Icon name="right" size={16} />
                </button>
              </div>
            </div>
          </div>
        )}

        {phase === 'finish' && (
          <div className="stack" style={{ flex: 1, justifyContent: 'center' }}>
            <div className="center">
              <div style={{ width: 72, height: 72, borderRadius: 24, margin: '0 auto', display: 'grid', placeItems: 'center', color: '#fff', background: 'linear-gradient(145deg, var(--green), #1f9d55)', boxShadow: '0 14px 30px -12px var(--green)' }}>
                <Icon name="check" size={38} stroke={2.6} />
              </div>
              <h1 style={{ margin: '14px 0 2px', fontSize: 28, letterSpacing: -0.6 }}>Session done</h1>
              <div className="muted small">It'll be ticked off in your week plan.</div>
            </div>
            <div className="grid3">
              <div className="stat"><div className="v">{fmt(elapsed)}</div><div className="l">Time</div></div>
              <div className="stat"><div className="v">{logs.length}</div><div className="l">Sets</div></div>
              <div className="stat">
                <div className="v">{Math.round(logs.reduce((t, l) => t + (l.kg ?? 0) * (l.reps ?? 0), 0)) || '—'}</div>
                <div className="l">kg lifted</div>
              </div>
            </div>
            <div className="card stack">
              <Slider label="How hard was that overall? (RPE)" value={rpe} onChange={setRpe} low="Very easy" high="Maximal" />
              <textarea placeholder="Notes: how did it feel? Any niggles?" value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
            <button className="btn block lg" onClick={save}>Save session</button>
          </div>
        )}
      </div>
    </div>
  )
}

function RestRing({ remaining, total }: { remaining: number; total: number }) {
  const size = 220
  const r = 96
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(1, remaining / total))
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--fill)" strokeWidth={12} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--accent)" strokeWidth={12} strokeLinecap="round" strokeDasharray={`${c * pct} ${c}`} style={{ transition: 'stroke-dasharray .25s linear' }} />
      </svg>
      <div className="big-number" style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>{fmt(Math.ceil(Math.max(0, remaining)))}</div>
    </div>
  )
}

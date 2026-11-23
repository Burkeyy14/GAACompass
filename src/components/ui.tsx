import type { CSSProperties, ReactNode } from 'react'
import type { ProgramSession } from '../lib/programs'
import { restLabel, rx } from '../lib/programs'
import { CatBadge, Icon, type IconName } from './Icon'

export function Slider(props: { label: string; value: number; onChange: (v: number) => void; low: string; high: string; min?: number }) {
  const min = props.min ?? 1
  const pct = ((props.value - min) / (10 - min)) * 100
  return (
    <div className="slider">
      <div className="top">
        <span>{props.label}</span>
        <span className="val">{props.value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={10}
        step={1}
        value={props.value}
        style={{ '--p': `${pct}%` } as CSSProperties}
        onChange={e => props.onChange(Number(e.target.value))}
        aria-label={props.label}
      />
      <div className="ends">
        <span>{props.low}</span>
        <span>{props.high}</span>
      </div>
    </div>
  )
}

export function Sheet({ onClose, title, children }: { onClose: () => void; title?: string; children: ReactNode }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()} role="dialog" aria-label={title}>
        <div className="grab" />
        {title && (
          <div className="sheet-head">
            <h2>{title}</h2>
            <button className="icon-btn" onClick={onClose} aria-label="Close">
              <Icon name="x" size={18} stroke={2.2} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

export function Chips<T extends string | number>(props: { options: { value: T; label: string; icon?: IconName }[]; value: T[] | T; onChange: (v: T) => void }) {
  const selected = Array.isArray(props.value) ? props.value : [props.value]
  return (
    <div className="chips">
      {props.options.map(o => (
        <button key={String(o.value)} type="button" className={'chip' + (selected.includes(o.value) ? ' on' : '')} onClick={() => props.onChange(o.value)}>
          {o.icon && <Icon name={o.icon} size={16} stroke={2} />}
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Banner({ kind, icon, children }: { kind: 'red' | 'amber' | 'green' | 'info'; icon?: IconName; children: ReactNode }) {
  const def: IconName = kind === 'red' || kind === 'amber' ? 'alert' : kind === 'green' ? 'check' : 'info'
  return (
    <div className={`banner ${kind}`}>
      <Icon name={icon ?? def} size={18} stroke={2} />
      <div>{children}</div>
    </div>
  )
}

export function SessionDetail({ s }: { s: ProgramSession }) {
  return (
    <div className="card">
      <div className="row">
        <CatBadge cat={s.category} size={42} />
        <div className="grow">
          <h3>{s.title}</h3>
          <div className="tiny muted" style={{ marginTop: 2 }}>
            ~{s.minutes} min · target effort {s.targetRpe}/10
          </div>
        </div>
      </div>
      {s.why && <div className="small muted" style={{ marginTop: 12 }}>{s.why}</div>}
      {s.blocks.map(b => (
        <div key={b.name}>
          <div className="block-title">{b.name}</div>
          {b.items.map(i => (
            <div className="ex" key={i.id}>
              <div className="grow">
                <div className="name">{i.name}</div>
                {i.cue && <div className="cue">{i.cue}</div>}
                {i.load && <div className="load">{i.load}</div>}
              </div>
              <div>
                <div className="rx">{rx(i)}</div>
                {i.restSec > 0 && <div className="rest">{restLabel(i.restSec)}</div>}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

/** Circular score ring 0–10. */
export function Ring({ value, max = 10, size = 96, color, label }: { value: number; max?: number; size?: number; color: string; label?: string }) {
  const r = (size - 12) / 2
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(1, value / max))
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--fill)" strokeWidth={10} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={`${c * pct} ${c}`}
          style={{ transition: 'stroke-dasharray .6s cubic-bezier(.2,.9,.3,1)', filter: `drop-shadow(0 2px 6px ${color}66)` }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
        <div>
          <div className="num" style={{ fontSize: size * 0.3, fontWeight: 800, letterSpacing: -1, lineHeight: 1 }}>{value}</div>
          {label && <div className="tiny muted" style={{ fontWeight: 600 }}>{label}</div>}
        </div>
      </div>
    </div>
  )
}

export const LEVEL_COLOR: Record<string, string> = { green: 'var(--green)', amber: 'var(--amber)', red: 'var(--red)', stop: 'var(--red)' }

export function Bars(props: { values: { label: string; value: number; color?: string }[]; max?: number; height?: number }) {
  const h = props.height ?? 120
  const max = props.max ?? Math.max(1, ...props.values.map(v => v.value))
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${props.values.length}, 1fr)`, gap: 6, alignItems: 'end', height: h }}>
      {props.values.map((v, i) => (
        <div
          key={i}
          title={`${v.label}: ${v.value}`}
          style={{
            height: `${Math.max(v.value > 0 ? 4 : 2, (v.value / max) * 100)}%`,
            borderRadius: 6,
            background: v.value > 0 ? (v.color ?? 'var(--accent)') : 'var(--fill)',
            transition: 'height .5s cubic-bezier(.2,.9,.3,1)',
          }}
        />
      ))}
    </div>
  )
}

export function BarLabels({ labels }: { labels: string[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${labels.length}, 1fr)`, gap: 6, marginTop: 6 }} className="tiny muted center">
      {labels.map((l, i) => (
        <span key={i}>{l}</span>
      ))}
    </div>
  )
}

export function Stepper({ value, onChange, step = 1, unit, min = 0 }: { value: number; onChange: (v: number) => void; step?: number; unit?: string; min?: number }) {
  return (
    <div className="stepper">
      <button onClick={() => onChange(Math.max(min, Math.round((value - step) * 100) / 100))} aria-label="Less">−</button>
      <div className="v">
        {value}
        {unit && <small>{unit}</small>}
      </div>
      <button onClick={() => onChange(Math.round((value + step) * 100) / 100)} aria-label="More">+</button>
    </div>
  )
}

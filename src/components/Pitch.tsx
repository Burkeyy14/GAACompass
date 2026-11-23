import type { MouseEvent } from 'react'
import type { FreeAttempt, Sport } from '../lib/types'

// From the end line you're shooting at out to the opposite 45, in metres (145m pitch).
// x: -45..45 (left to right), y: 0..102 metres out from the end line.
const W = 90
const H = 102
const LEN = 145

interface Props {
  sport: Sport
  attempts: FreeAttempt[]
  pending?: { x: number; y: number } | null
  onTap?: (x: number, y: number) => void
}

export function Pitch({ sport, attempts, pending, onTap }: Props) {
  const football = sport === 'football' || sport === 'lgfa'
  const sx = (x: number) => x + W / 2

  function handle(e: MouseEvent<SVGSVGElement>) {
    if (!onTap) return
    const svg = e.currentTarget
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const p = pt.matrixTransform(svg.getScreenCTM()!.inverse())
    const x = Math.round(Math.max(-45, Math.min(45, p.x - W / 2)))
    const y = Math.round(Math.max(0, Math.min(H, p.y)))
    onTap(x, y)
  }

  const line = { stroke: 'rgba(255,255,255,0.8)', strokeWidth: 0.35, fill: 'none' }
  const faint = { stroke: 'rgba(255,255,255,0.45)', strokeWidth: 0.3, fill: 'none', strokeDasharray: '1.4 1' }
  const label = (y: number, t: string) => (
    <text x={W - 1.6} y={y - 0.9} fontSize="2.3" fill="rgba(255,255,255,0.85)" textAnchor="end" fontWeight={700} fontFamily="system-ui">
      {t}
    </text>
  )
  // Standard GAA pitch markings (shared by football and hurling pitches)
  const lines = [
    { y: 13, t: '13' },
    { y: 20, t: '20' },
    { y: 45, t: '45' },
    { y: 65, t: '65' },
    { y: LEN / 2, t: 'Half', faint: true },
    { y: LEN - 65, t: 'Own 65' },
    { y: LEN - 45, t: 'Own 45' },
  ]

  return (
    <div className="pitch-wrap">
      <svg viewBox={`0 -4 ${W} ${H + 4}`} onClick={handle} role="img" aria-label="Tap the pitch where you took the shot from">
        <defs>
          <pattern id="mow" width="90" height="10" patternUnits="userSpaceOnUse">
            <rect width="90" height="5" fill="#2f9a55" />
            <rect y="5" width="90" height="5" fill="#2a8c4c" />
          </pattern>
          <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity="0.18" />
          </linearGradient>
        </defs>
        <rect x="0" y="-4" width={W} height={H + 4} fill="url(#mow)" />
        <rect x="0" y="-4" width={W} height={H + 4} fill="url(#shade)" />

        {/* goal */}
        <line x1={sx(-3.25)} x2={sx(3.25)} y1={0} y2={0} stroke="#fff" strokeWidth={0.9} />
        <line x1={sx(-3.25)} x2={sx(-3.25)} y1={-3.6} y2={0} stroke="#fff" strokeWidth={0.6} />
        <line x1={sx(3.25)} x2={sx(3.25)} y1={-3.6} y2={0} stroke="#fff" strokeWidth={0.6} />
        <line x1={0} x2={W} y1={0} y2={0} {...line} />
        <rect x={sx(-7)} y={0} width={14} height={4.5} {...line} />
        <rect x={sx(-9.5)} y={0} width={19} height={13} {...line} />
        <path d={`M ${sx(-13)} 20 A 13 13 0 0 0 ${sx(13)} 20`} {...line} />
        {football && (
          <>
            <path d={`M ${sx(-40)} 0 A 40 40 0 0 0 ${sx(40)} 0`} {...line} strokeDasharray="1.4 0.9" />
            <text x={sx(0)} y={38.3} fontSize="2.1" fill="rgba(255,255,255,0.75)" textAnchor="middle" fontFamily="system-ui" fontWeight={600}>
              2-point arc
            </text>
          </>
        )}
        {lines.map(l => (
          <g key={l.t}>
            <line x1={0} x2={W} y1={l.y} y2={l.y} {...(l.faint ? faint : line)} />
            {label(l.y, l.t)}
          </g>
        ))}

        {attempts.map((a, i) => (
          <g key={i}>
            {a.scored ? (
              <circle cx={sx(a.x)} cy={a.y} r={1.5} fill="#fff" stroke="rgba(0,0,0,.35)" strokeWidth={0.3} />
            ) : (
              <g stroke="#ff6b6b" strokeWidth={0.75} strokeLinecap="round">
                <line x1={sx(a.x) - 1.2} y1={a.y - 1.2} x2={sx(a.x) + 1.2} y2={a.y + 1.2} />
                <line x1={sx(a.x) - 1.2} y1={a.y + 1.2} x2={sx(a.x) + 1.2} y2={a.y - 1.2} />
              </g>
            )}
          </g>
        ))}
        {pending && (
          <g>
            <circle cx={sx(pending.x)} cy={pending.y} r={3.2} fill="rgba(255,214,10,.25)" />
            <circle cx={sx(pending.x)} cy={pending.y} r={1.8} fill="none" stroke="#ffd60a" strokeWidth={0.7} />
            <text x={sx(pending.x)} y={pending.y - 4} fontSize="2.6" fill="#fff" textAnchor="middle" fontWeight={800} fontFamily="system-ui">
              {Math.round(distance(pending))}m
            </text>
          </g>
        )}
      </svg>
    </div>
  )
}

export function distance(a: { x: number; y: number }) {
  return Math.hypot(a.x, a.y)
}

export const ZONES = [
  { label: 'Under 20m', test: (d: number) => d < 20 },
  { label: '20–30m', test: (d: number) => d >= 20 && d < 30 },
  { label: '30–40m', test: (d: number) => d >= 30 && d < 40 },
  { label: '40–50m', test: (d: number) => d >= 40 && d < 50 },
  { label: '50–65m', test: (d: number) => d >= 50 && d < 65 },
  { label: '65m+', test: (d: number) => d >= 65 },
]

export function zoneStats(attempts: FreeAttempt[]) {
  return ZONES.map(z => {
    const inZone = attempts.filter(a => z.test(distance(a)))
    const scored = inZone.filter(a => a.scored).length
    return { label: z.label, attempts: inZone.length, scored, pct: inZone.length ? Math.round((scored / inZone.length) * 100) : null }
  })
}

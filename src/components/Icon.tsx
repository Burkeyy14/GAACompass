// GAA Compass icon set: 24×24, 1.8px rounded strokes, drawn for this app.
import type { CSSProperties, ReactNode } from 'react'

const P: Record<string, ReactNode> = {
  home: (
    <>
      <path d="M3.5 10.6 12 3.8l8.5 6.8" />
      <path d="M5.8 9v10.2c0 .6.4 1 1 1h3.7v-5.5c0-.6.4-1 1-1h1c.6 0 1 .4 1 1v5.5h3.7c.6 0 1-.4 1-1V9" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="3.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
      <circle cx="8.5" cy="14.5" r=".9" fill="currentColor" stroke="none" />
      <circle cx="12" cy="14.5" r=".9" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="14.5" r=".9" fill="currentColor" stroke="none" />
    </>
  ),
  train: (
    <>
      <path d="M6.5 8v8M17.5 8v8M3.5 10v4M20.5 10v4M6.5 12h11" />
    </>
  ),
  goal: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.8" />
      <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
    </>
  ),
  chart: (
    <>
      <path d="M4 20h16" />
      <rect x="5.5" y="12" width="3" height="5.5" rx="1" />
      <rect x="10.5" y="8" width="3" height="9.5" rx="1" />
      <rect x="15.5" y="4.5" width="3" height="13" rx="1" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.8v2.4M12 18.8v2.4M21.2 12h-2.4M5.2 12H2.8M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7M18.5 18.5l-1.7-1.7M7.2 7.2 5.5 5.5" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8.2" r="3.8" />
      <path d="M4.8 20.2c.9-3.6 3.7-5.6 7.2-5.6s6.3 2 7.2 5.6" />
    </>
  ),
  bolt: <path d="M13.2 2.8 5.5 13.2h5.6l-1 8 7.7-10.4h-5.6l1-8Z" />,
  dumbbell: (
    <>
      <rect x="2.8" y="9" width="3.2" height="6" rx="1.2" />
      <rect x="18" y="9" width="3.2" height="6" rx="1.2" />
      <rect x="6" y="6.8" width="3" height="10.4" rx="1.2" />
      <rect x="15" y="6.8" width="3" height="10.4" rx="1.2" />
      <path d="M9 12h6" />
    </>
  ),
  pitch: (
    <>
      <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
      <path d="M12 4.5v15M3 9.5h3v5H3M21 9.5h-3v5h3" />
    </>
  ),
  trophy: (
    <>
      <path d="M7.5 4h9v5a4.5 4.5 0 0 1-9 0V4Z" />
      <path d="M7.5 6H4.5c0 2.8 1.3 4.2 3.4 4.4M16.5 6h3c0 2.8-1.3 4.2-3.4 4.4M12 13.5V17M8.5 20.5h7M9.5 17h5" />
    </>
  ),
  leaf: (
    <>
      <path d="M5 19c0-8.2 5.2-13.5 14-14 .3 8.6-4.9 14-12 14H5Z" />
      <path d="M5 19c3.2-4.4 6.1-6.9 9.5-8.8" />
    </>
  ),
  moon: <path d="M19.5 14.6A8 8 0 0 1 9.4 4.5a8 8 0 1 0 10.1 10.1Z" />,
  lungs: (
    <>
      <path d="M12 4v7.5M12 11.5 9 9M12 11.5l3-2.5" />
      <path d="M8.8 8.4C6.2 9 4.5 12 4.2 16.5c-.1 1.9 1.2 3.4 3 3.2 1.9-.2 2.5-1.6 2.5-3.4V9.2c0-.6-.4-.9-.9-.8ZM15.2 8.4c2.6.6 4.3 3.6 4.6 8.1.1 1.9-1.2 3.4-3 3.2-1.9-.2-2.5-1.6-2.5-3.4V9.2c0-.6.4-.9.9-.8Z" />
    </>
  ),
  ball: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M5 8.5c3 1 4.5 3.4 4.5 7.2M19 8.5c-3 1-4.5 3.4-4.5 7.2M7.5 19.3c2.8-1.6 6.2-1.6 9 0" />
    </>
  ),
  pulse: <path d="M3 12h4l2.2-5.5 4.2 11 2.4-5.5H21" />,
  heart: <path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20Z" />,
  shield: (
    <>
      <path d="M12 3.2 5 6v5.4c0 4.4 2.9 8 7 9.4 4.1-1.4 7-5 7-9.4V6l-7-2.8Z" />
      <path d="m8.8 12 2.2 2.2 4.2-4.4" />
    </>
  ),
  flame: <path d="M12 21c-3.6 0-6.2-2.6-6.2-6 0-3.8 3.3-5.3 3.9-9.8 2.6 1.6 4 3.8 4.2 6.2.9-.6 1.4-1.7 1.5-3 1.9 1.7 2.8 4 2.8 6.6 0 3.4-2.6 6-6.2 6Z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  x: <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />,
  left: <path d="m14.5 5.5-6.5 6.5 6.5 6.5" />,
  right: <path d="m9.5 5.5 6.5 6.5-6.5 6.5" />,
  down: <path d="m5.5 9.5 6.5 6.5 6.5-6.5" />,
  play: <path d="M8 5.5v13c0 .8.9 1.3 1.6.9l10-6.5c.6-.4.6-1.4 0-1.8l-10-6.5C8.9 4.2 8 4.7 8 5.5Z" fill="currentColor" stroke="none" />,
  pause: (
    <>
      <rect x="6.5" y="5" width="3.8" height="14" rx="1.2" fill="currentColor" stroke="none" />
      <rect x="13.7" y="5" width="3.8" height="14" rx="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  skip: (
    <>
      <path d="M5.5 6v12l8.5-6-8.5-6Z" fill="currentColor" stroke="none" />
      <path d="M17.5 6v12" />
    </>
  ),
  timer: (
    <>
      <circle cx="12" cy="13.5" r="7.2" />
      <path d="M12 13.5V9.8M9.8 3h4.4M18.2 7.2l1.3-1.3" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5" />
      <circle cx="12" cy="7.8" r=".9" fill="currentColor" stroke="none" />
    </>
  ),
  alert: (
    <>
      <path d="M10.3 4.3 2.9 17.4c-.8 1.3.2 3 1.7 3h14.8c1.5 0 2.5-1.7 1.7-3L13.7 4.3c-.8-1.3-2.6-1.3-3.4 0Z" />
      <path d="M12 9.5v4.5" />
      <circle cx="12" cy="17" r=".9" fill="currentColor" stroke="none" />
    </>
  ),
  trend: (
    <>
      <path d="m3.5 16.5 5.5-5.5 4 4 7.5-7.5" />
      <path d="M15.5 7.5h5v5" />
    </>
  ),
  ruler: (
    <>
      <rect x="2.5" y="8" width="19" height="8" rx="2" />
      <path d="M6.5 8v3M10 8v4.5M13.5 8v3M17 8v4.5" />
    </>
  ),
  sparkle: <path d="M12 3.5c.6 4.3 2.2 5.9 6.5 6.5-4.3.6-5.9 2.2-6.5 6.5-.6-4.3-2.2-5.9-6.5-6.5 4.3-.6 5.9-2.2 6.5-6.5ZM18.5 15.5c.3 1.9 1 2.6 3 3-2 .3-2.7 1-3 3-.3-2-1-2.7-3-3 2-.4 2.7-1.1 3-3Z" />,
  download: (
    <>
      <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5" />
      <path d="M4.5 16.5v2c0 .8.7 1.5 1.5 1.5h12c.8 0 1.5-.7 1.5-1.5v-2" />
    </>
  ),
  share: (
    <>
      <path d="M12 3.5v11M8 7.5l4-4 4 4" />
      <path d="M8 10.5H6.5c-.8 0-1.5.7-1.5 1.5v6.5c0 .8.7 1.5 1.5 1.5h11c.8 0 1.5-.7 1.5-1.5V12c0-.8-.7-1.5-1.5-1.5H16" />
    </>
  ),
  logout: (
    <>
      <path d="M14 4.5H6.5c-.8 0-1.5.7-1.5 1.5v12c0 .8.7 1.5 1.5 1.5H14" />
      <path d="M10.5 12h10M17 8.5l3.5 3.5-3.5 3.5" />
    </>
  ),
  star: <path d="m12 3.8 2.5 5.2 5.7.8-4.1 4 1 5.6L12 16.7l-5.1 2.7 1-5.6-4.1-4 5.7-.8L12 3.8Z" />,
  undo: (
    <>
      <path d="M8.5 5 4.5 9l4 4" />
      <path d="M4.5 9h9.5a5.5 5.5 0 0 1 0 11H9" />
    </>
  ),
  trash: (
    <>
      <path d="M4.5 7h15M9.5 7V4.8c0-.5.4-.8.8-.8h3.4c.4 0 .8.3.8.8V7" />
      <path d="M6.5 7l.8 12c.1.8.7 1.5 1.5 1.5h6.4c.8 0 1.4-.7 1.5-1.5l.8-12" />
    </>
  ),
  edit: (
    <>
      <path d="M15.5 4.5 19.5 8.5 9 19H5v-4L15.5 4.5Z" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="8.8" />
      <path d="m15.6 8.4-2.1 5.1-5.1 2.1 2.1-5.1 5.1-2.1Z" fill="currentColor" fillOpacity=".18" />
    </>
  ),
  whistle: (
    <>
      <path d="M3.5 10.5h9.5a4.5 4.5 0 1 1-4.3 5.8H6a2.5 2.5 0 0 1-2.5-2.5v-3.3Z" />
      <path d="M13 10.5V7.5h4M11.5 7.5V5" />
    </>
  ),
  route: (
    <>
      <circle cx="6" cy="18" r="2.3" />
      <circle cx="18" cy="6" r="2.3" />
      <path d="M8.3 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.7" />
    </>
  ),
  cloud: <path d="M7 18.5a4.5 4.5 0 0 1-.6-9 6 6 0 0 1 11.4 1.6A3.8 3.8 0 0 1 17.2 18.5H7Z" />,
}

export type IconName = keyof typeof P

export function Icon({ name, size = 22, stroke = 1.8, style, className }: { name: IconName | string; size?: number; stroke?: number; style?: CSSProperties; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      className={className}
      aria-hidden
    >
      {P[name] ?? P.info}
    </svg>
  )
}

/** Icon + tint for each activity/category, used everywhere. */
export const CAT_STYLE: Record<string, { icon: IconName; tint: string }> = {
  gym: { icon: 'dumbbell', tint: '#7c5cff' },
  speed: { icon: 'bolt', tint: '#ff9f0a' },
  conditioning: { icon: 'lungs', tint: '#ff375f' },
  skills: { icon: 'ball', tint: '#30b0c7' },
  recovery: { icon: 'leaf', tint: '#34c759' },
  pitch: { icon: 'pitch', tint: '#0a84ff' },
  match: { icon: 'trophy', tint: '#ffcc00' },
  rest: { icon: 'moon', tint: '#8e8e93' },
}

export function CatBadge({ cat, size = 36 }: { cat: string; size?: number }) {
  const c = CAT_STYLE[cat] ?? CAT_STYLE.rest
  return (
    <span className="cat-badge" style={{ width: size, height: size, background: `linear-gradient(145deg, ${c.tint}, ${c.tint}cc)` }}>
      <Icon name={c.icon} size={Math.round(size * 0.56)} stroke={2} />
    </span>
  )
}

export const GOAL_ICON: Record<string, IconName> = {
  body: 'flame',
  speed: 'bolt',
  power: 'sparkle',
  strength: 'dumbbell',
  engine: 'lungs',
  agility: 'route',
  hamstring: 'shield',
  frees: 'goal',
  skills: 'ball',
}
export const GOAL_TINT: Record<string, string> = {
  body: '#ff6b35',
  speed: '#ff9f0a',
  power: '#ff375f',
  strength: '#7c5cff',
  engine: '#ff453a',
  agility: '#30b0c7',
  hamstring: '#34c759',
  frees: '#0a84ff',
  skills: '#5e5ce6',
}

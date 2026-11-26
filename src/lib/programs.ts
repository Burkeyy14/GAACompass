// Session library and goal definitions.
//
// Every exercise is structured (sets, reps / seconds / metres, rest) so the workout
// player can run it set-by-set with rest timers. Prescriptions are personalised from the
// athlete profile: age, gym experience, bodyweight, position and injury history.
//
// Principles: progressive overload in 3-week builds + a deload week; low-volume, high-quality
// sprinting with full recovery; Nordic hamstring curls and Copenhagen planks for hamstring and
// groin resilience; less volume in-season; extra caution after a recent hamstring injury.

import type { Equipment, GoalType, Phase, Position, Profile, SessionCategory, Sport, BenchmarkTest, TrainingAge, Level, Sex } from './types'

/** First sport in the player's list (always present after normalizeProfile). */
export function primarySport(profile: Profile): Sport {
  return profile.sports?.[0] ?? profile.sport
}

/** True when the player plays two codes. */
export function isDualPlayer(profile: Profile): boolean {
  return (profile.sports?.length ?? 1) > 1
}

export type ItemKind = 'reps' | 'hold' | 'sprint' | 'drill'

export interface Item {
  id: string
  name: string
  kind: ItemKind
  sets: number
  reps?: number
  seconds?: number
  distance?: number
  perSide?: boolean
  restSec: number
  /** free-text prescription override (drills, warm-ups, skills) */
  text?: string
  /** load guidance, e.g. "≈ 95 kg · RPE 7–8" */
  load?: string
  /** suggested starting weight for the player */
  startKg?: number
  cue?: string
  /** auto-regulation flags */
  maxSpeed?: boolean
  eccentric?: boolean
  plyo?: boolean
  hinge?: boolean
}

export interface Block {
  name: string
  items: Item[]
}

export interface ProgramSession {
  key: string
  title: string
  category: SessionCategory
  minutes: number
  targetRpe: number
  intensity: 'high' | 'moderate' | 'low'
  legHeavy: boolean
  blocks: Block[]
  why?: string
}

export interface Athlete {
  ageBand: 'youth' | 'adult' | 'masters'
  trainingAge: TrainingAge
  weightKg: number | null
  position: Position
  level: Level
  sex: Sex
  prevHamstring: boolean
  prevGroin: boolean
  prevCalf: boolean
}

export interface Ctx {
  /** 0,1,2 = build weeks within a 4-week block */
  step: number
  deload: boolean
  /** absolute week number in the plan, 1-based */
  week: number
  equipment: Equipment
  phase: Phase
  sport: Sport
  athlete: Athlete
}

export function athleteFrom(p: Profile): Athlete {
  const age = p.age ?? 22
  return {
    ageBand: age < 18 ? 'youth' : age >= 30 ? 'masters' : 'adult',
    trainingAge: p.trainingAge ?? 'intermediate',
    weightKg: p.weightKg,
    position: p.position ?? 'unknown',
    level: p.level,
    sex: p.sex ?? 'unspecified',
    prevHamstring: (p.recentInjuries ?? []).includes('hamstring'),
    prevGroin: (p.recentInjuries ?? []).includes('groin'),
    prevCalf: (p.recentInjuries ?? []).includes('calf'),
  }
}

// ---------- formatting ----------

export function rx(i: Item): string {
  if (i.text) return i.text
  const side = i.perSide ? ' /side' : ''
  if (i.kind === 'sprint') return `${i.sets} × ${i.distance}m`
  if (i.kind === 'hold') return `${i.sets} × ${i.seconds}s${side}`
  if (i.kind === 'reps') return `${i.sets} × ${i.reps}${side}`
  return ''
}

export function restLabel(sec: number): string {
  if (!sec) return ''
  if (sec < 90) return `${sec}s rest`
  const m = sec / 60
  return `${Number.isInteger(m) ? m : m.toFixed(1)} min rest`
}

// ---------- personalisation helpers ----------

/** Number of working sets, adjusted for experience, season and deloads. */
export function setsFor(ctx: Ctx, base: number): number {
  let s = base
  if (ctx.athlete.trainingAge === 'beginner') s -= 1
  if (ctx.phase === 'in') s -= 1
  if (ctx.deload) s -= 1
  if (ctx.athlete.ageBand === 'youth') s = Math.min(s, 3)
  return Math.max(ctx.deload ? 1 : 2, s)
}

const prog = <T,>(ctx: Ctx, arr: [T, T, T]): T => arr[Math.min(2, ctx.step)]

// Working-weight estimates as a multiple of bodyweight for a set of ~5 at RPE 7–8.
// Deliberately conservative: they are a starting point the player adjusts on the day.
const LIFT_FACTORS: Record<string, Record<TrainingAge, number>> = {
  trapbar: { beginner: 0.8, intermediate: 1.3, advanced: 1.7 },
  squat: { beginner: 0.6, intermediate: 1.0, advanced: 1.4 },
  rdl: { beginner: 0.5, intermediate: 0.8, advanced: 1.1 },
  bench: { beginner: 0.5, intermediate: 0.8, advanced: 1.05 },
  press: { beginner: 0.3, intermediate: 0.5, advanced: 0.65 },
  row: { beginner: 0.4, intermediate: 0.65, advanced: 0.85 },
  hipthrust: { beginner: 0.8, intermediate: 1.3, advanced: 1.8 },
  splitsquat: { beginner: 0.15, intermediate: 0.25, advanced: 0.35 }, // per dumbbell
}

function loadFor(ctx: Ctx, lift: keyof typeof LIFT_FACTORS, reps: number): Pick<Item, 'load' | 'startKg'> {
  const a = ctx.athlete
  if (a.ageBand === 'youth') return { load: 'Light: perfect technique first' }
  if (!a.weightKg) return { load: 'RPE 7–8 (2 reps left in the tank)' }
  const repAdj = reps >= 8 ? 0.82 : reps <= 4 ? 1.07 : 1
  const kg = Math.round((a.weightKg * LIFT_FACTORS[lift][a.trainingAge] * repAdj * (ctx.deload ? 0.85 : 1)) / 2.5) * 2.5
  return { load: `Start ≈ ${kg} kg · RPE 7–8`, startKg: kg }
}

function bwLoad(ctx: Ctx, pct: number, label: string): Pick<Item, 'load' | 'startKg'> {
  if (!ctx.athlete.weightKg) return { load: label }
  const kg = Math.round((ctx.athlete.weightKg * pct) / 2.5) * 2.5
  return { load: `≈ ${kg} kg (${label})`, startKg: kg }
}

const drill = (id: string, name: string, text: string, cue?: string): Item => ({ id, name, kind: 'drill', sets: 1, restSec: 0, text, cue })

// ---------- shared blocks ----------

const speedWarmup = (ctx: Ctx): Block => {
  const a = ctx.athlete
  const items: Item[] = [
    drill('jog', 'Easy jog + skips', a.ageBand === 'masters' ? '5 min' : '3 min'),
    drill('swings', 'Leg swings (front/back, side)', '10 each leg'),
    drill('lunge-rot', 'Walking lunge with rotation', '6 each leg'),
  ]
  if (a.ageBand === 'masters' || a.prevCalf) items.push({ id: 'calf-iso', name: 'Calf raise hold (Achilles prep)', kind: 'hold', sets: 2, seconds: 30, restSec: 30 })
  items.push(
    drill('a-skip', 'A-march → A-skip', '2 × 20m', 'Tall posture, foot lands under hip'),
    drill('wall', 'Wall drill marches', '2 × 5 each leg', 'Drive knee up, strike down and back'),
    drill('buildups', 'Build-up runs', a.prevHamstring ? '4 × 40m at 60 / 75 / 85 / 95%' : '3 × 40m at 60 / 75 / 90%', 'Never sprint cold. This protects your hamstrings.'),
  )
  return { name: 'Warm-up', items }
}

const coolDown = (): Block => ({
  name: 'Cool-down',
  items: [drill('cool-jog', 'Easy walk/jog', '3–5 min'), drill('cool-stretch', 'Hip flexor + calf stretch', '30s each side')],
})

export function nordicReps(ctx: Ctx): { sets: number; reps: number } {
  if (ctx.deload) return { sets: 1, reps: 4 }
  if (ctx.phase === 'in') return { sets: 2, reps: 4 }
  const begin = ctx.athlete.trainingAge === 'beginner' || ctx.athlete.prevHamstring
  const ladder = begin
    ? [{ sets: 2, reps: 3 }, { sets: 2, reps: 4 }, { sets: 2, reps: 5 }, { sets: 3, reps: 5 }]
    : [{ sets: 2, reps: 4 }, { sets: 2, reps: 6 }, { sets: 3, reps: 5 }, { sets: 3, reps: 6 }]
  return ladder[Math.min(3, Math.floor((ctx.week - 1) / 2))]
}

const nordic = (ctx: Ctx): Item => ({
  id: 'nordic',
  name: 'Nordic hamstring curl',
  kind: 'reps',
  ...nordicReps(ctx),
  restSec: 120,
  cue: 'Lower as slowly as you can, catch yourself with your hands. Partner or anchor your feet.',
  eccentric: true,
})

const resilience = (ctx: Ctx): Block => ({
  name: 'Injury resilience',
  items: [
    nordic(ctx),
    {
      id: 'copenhagen',
      name: ctx.week <= 3 || ctx.athlete.prevGroin ? 'Copenhagen plank (short lever, knee on bench)' : 'Copenhagen plank',
      kind: 'hold',
      sets: 2,
      seconds: ctx.week <= 3 ? 15 : 25,
      perSide: true,
      restSec: 45,
      cue: 'Top leg on bench, lift hips into a straight line',
    },
    { id: 'sl-calf', name: 'Single-leg calf raise', kind: 'reps', sets: ctx.athlete.prevCalf || ctx.athlete.ageBand === 'masters' ? 3 : 2, reps: 12, perSide: true, restSec: 45, cue: 'Slow down, pause at the top' },
  ],
})

// ---------- speed ----------

export function accelSession(ctx: Ctx): ProgramSession {
  const reps = ctx.deload ? 4 : prog(ctx, [5, 6, 7]) - (ctx.athlete.ageBand === 'masters' ? 1 : 0)
  const back = ctx.athlete.position === 'fullback' || ctx.athlete.position === 'halfback'
  return {
    key: 'accel',
    title: 'Acceleration',
    category: 'speed',
    minutes: 40,
    targetRpe: 7,
    intensity: 'high',
    legHeavy: false,
    why: 'The first 5–20m is where breaks are won and lost. Short sprints with full rest train speed, not fitness.',
    blocks: [
      speedWarmup(ctx),
      {
        name: 'Acceleration drills',
        items: [
          { id: 'falling', name: 'Falling starts', kind: 'sprint', sets: 3, distance: 10, restSec: 60, cue: 'Lean from the ankles, punch the first 3 steps' },
          { id: 'half-kneel', name: back ? 'Backpedal → turn & sprint' : 'Half-kneeling starts', kind: 'sprint', sets: 2, distance: 10, restSec: 60 },
        ],
      },
      {
        name: 'Sprints',
        items: [
          { id: 'acc10', name: '10m sprint (mixed starts)', kind: 'sprint', sets: reps, distance: 10, restSec: 75, cue: 'Push-up start, standing, reacting to a call' },
          { id: 'acc20', name: '20m sprint', kind: 'sprint', sets: ctx.deload ? 2 : prog(ctx, [3, 3, 4]), distance: 20, restSec: 120 },
          ...(ctx.equipment === 'gym' && !ctx.deload && ctx.athlete.ageBand !== 'youth'
            ? [{ id: 'sled', name: 'Heavy sled push', kind: 'sprint' as const, sets: 4, distance: 15, restSec: 120, cue: 'Load so you slow down by about a third to a half' }]
            : []),
        ],
      },
      coolDown(),
    ],
  }
}

export function maxVelocitySession(ctx: Ctx): ProgramSession {
  const slow = ctx.athlete.prevHamstring
  const dist = ctx.deload ? 10 : slow ? prog(ctx, [10, 10, 15]) : prog(ctx, [10, 15, 20])
  const sets = (ctx.deload ? 3 : prog(ctx, [3, 4, 4])) - (ctx.athlete.ageBand === 'masters' ? 1 : 0)
  return {
    key: 'maxv',
    title: 'Top speed',
    category: 'speed',
    minutes: 40,
    targetRpe: 7,
    intensity: 'high',
    legHeavy: false,
    why: 'Regularly touching 90%+ of your top speed is one of the best protections against hamstring strains. The muscle gets used to the job it has to do in a match.',
    blocks: [
      speedWarmup(ctx),
      {
        name: 'Technique',
        items: [drill('ab-skip', 'A-skip → B-skip', '2 × 20m each'), { id: 'sl-bounds', name: 'Straight-leg bounds', kind: 'sprint', sets: 2, distance: 20, restSec: 60, plyo: true }],
      },
      {
        name: 'Top-speed sprints',
        items: [
          { id: 'flying', name: `Flying ${dist}m (20–25m run-in)`, kind: 'sprint', sets, distance: dist, restSec: 180, cue: 'Relaxed face and shoulders, tall hips', maxSpeed: true },
          ...(ctx.deload ? [] : [{ id: 'inout', name: 'In-and-outs (fast–float–fast)', kind: 'sprint' as const, sets: prog(ctx, [2, 2, 3]), distance: 60, restSec: 180, maxSpeed: true }]),
        ],
      },
      coolDown(),
    ],
  }
}

export function inSeasonSpeedSession(ctx: Ctx): ProgramSession {
  return {
    key: 'speed-in',
    title: 'Speed top-up',
    category: 'speed',
    minutes: 25,
    targetRpe: 6,
    intensity: 'moderate',
    legHeavy: false,
    why: 'In-season you keep your speed with a small dose of quality sprinting, and keep your hamstrings used to high speed.',
    blocks: [
      speedWarmup(ctx),
      {
        name: 'Sprints',
        items: [
          { id: 'acc10', name: '10m acceleration', kind: 'sprint', sets: 4, distance: 10, restSec: 75 },
          { id: 'flying15', name: 'Flying 15m', kind: 'sprint', sets: ctx.deload ? 2 : 3, distance: 15, restSec: 180, maxSpeed: true },
        ],
      },
    ],
  }
}

// ---------- agility ----------

export function agilitySession(ctx: Ctx): ProgramSession {
  const pos = ctx.athlete.position
  const keeper = pos === 'goalkeeper'
  const back = pos === 'fullback' || pos === 'halfback'
  return {
    key: 'agility',
    title: 'Agility & deceleration',
    category: 'speed',
    minutes: 35,
    targetRpe: 7,
    intensity: 'high',
    legHeavy: false,
    why: 'Stopping well is as important as starting fast. Good deceleration technique also protects your knees and groin.',
    blocks: [
      speedWarmup(ctx),
      {
        name: 'Deceleration',
        items: [
          { id: 'decel', name: 'Sprint 10m → stop in 3 steps', kind: 'sprint', sets: prog(ctx, [4, 5, 6]), distance: 10, restSec: 60, cue: 'Hips low, chest over knees, short choppy steps' },
          { id: 'lat-bound', name: 'Lateral bound and stick', kind: 'reps', sets: 3, reps: 3, perSide: true, restSec: 60, plyo: true },
        ],
      },
      {
        name: 'Change of direction',
        items: [
          { id: '505', name: '5-0-5 turns (alternate turning foot)', kind: 'sprint', sets: ctx.deload ? 3 : prog(ctx, [4, 5, 6]), distance: 20, restSec: 90 },
          keeper
            ? { id: 'gk-shuffle', name: 'Lateral shuffle → dive-reaction', kind: 'reps', sets: 4, reps: 4, perSide: true, restSec: 60 }
            : back
              ? { id: 'jockey', name: 'Jockey & mirror drill (partner)', kind: 'hold', sets: 5, seconds: 10, restSec: 50, cue: 'Stay square, react to their hips' }
              : { id: 'reactive', name: 'Reactive cut on a call/point', kind: 'reps', sets: 5, reps: 2, restSec: 60 },
        ],
      },
      coolDown(),
    ],
  }
}

// ---------- gym ----------

export function lowerStrength(ctx: Ctx): ProgramSession {
  const gym = ctx.equipment === 'gym'
  const s = setsFor(ctx, 3)
  const reps = prog(ctx, [6, 5, 4])
  return {
    key: 'lower-strength',
    title: 'Lower body strength',
    category: 'gym',
    minutes: 55,
    targetRpe: 7,
    intensity: 'high',
    legHeavy: true,
    why: 'Stronger legs put more force into the ground, which makes you faster and harder to injure.',
    blocks: [
      {
        name: 'Prime',
        items: [
          { id: 'pogo', name: 'Pogo jumps', kind: 'reps', sets: 2, reps: 15, restSec: 45, plyo: true },
          { id: 'box', name: gym ? 'Box jump' : 'Squat jump', kind: 'reps', sets: setsFor(ctx, 3), reps: 4, restSec: 75, cue: 'Maximum intent, step down', plyo: true },
        ],
      },
      {
        name: 'Strength',
        items: gym
          ? [
              { id: 'trapbar', name: 'Trap bar deadlift', kind: 'reps', sets: s, reps, restSec: 180, ...loadFor(ctx, 'trapbar', reps), hinge: true, cue: 'Push the floor away, stay tall' },
              { id: 'rfess', name: 'Rear-foot elevated split squat (DBs)', kind: 'reps', sets: s, reps: 6, perSide: true, restSec: 90, ...loadFor(ctx, 'splitsquat', 6) },
              { id: 'rdl', name: 'Romanian deadlift', kind: 'reps', sets: s, reps: 8, restSec: 120, ...loadFor(ctx, 'rdl', 8), cue: 'Hips back, slow on the way down', hinge: true },
            ]
          : [
              { id: 'rfess', name: 'Rear-foot elevated split squat (backpack)', kind: 'reps', sets: s, reps: 10, perSide: true, restSec: 90 },
              { id: 'slrdl', name: 'Single-leg Romanian deadlift', kind: 'reps', sets: s, reps: 8, perSide: true, restSec: 75, hinge: true },
              { id: 'slthrust', name: 'Single-leg hip thrust', kind: 'reps', sets: s, reps: 10, perSide: true, restSec: 60 },
            ],
      },
      resilience(ctx),
    ],
  }
}

export function powerSession(ctx: Ctx): ProgramSession {
  const gym = ctx.equipment === 'gym'
  const a = ctx.athlete
  const s = setsFor(ctx, 4)
  const allowDepth = ctx.step >= 1 && !ctx.deload && ctx.phase !== 'in' && a.trainingAge !== 'beginner' && a.ageBand === 'adult'
  const mid = a.position === 'midfield' || a.position === 'goalkeeper'
  return {
    key: 'power',
    title: 'Power & plyometrics',
    category: 'gym',
    minutes: 50,
    targetRpe: 7,
    intensity: 'high',
    legHeavy: true,
    why: 'Explosiveness is force produced fast. Low reps, full rest and maximum intent on every rep.',
    blocks: [
      {
        name: 'Plyometrics',
        items: [
          { id: 'broad', name: 'Broad jump (stick the landing)', kind: 'reps', sets: setsFor(ctx, 3), reps: 3, restSec: 90, plyo: true },
          { id: 'lat-bound', name: 'Lateral bound (stick)', kind: 'reps', sets: setsFor(ctx, 3), reps: 3, perSide: true, restSec: 75, plyo: true },
          ...(mid ? [{ id: 'sl-jump', name: 'Single-leg jump to high reach', kind: 'reps' as const, sets: 3, reps: 3, perSide: true, restSec: 75, cue: 'Like going up for a high ball', plyo: true }] : []),
          ...(allowDepth ? [{ id: 'drop', name: 'Drop jump (30cm box)', kind: 'reps' as const, sets: 3, reps: 4, restSec: 120, cue: 'Minimal ground contact', plyo: true }] : []),
        ],
      },
      {
        name: 'Power',
        items: gym
          ? [
              { id: 'tb-jump', name: 'Trap bar jump', kind: 'reps', sets: s, reps: 3, restSec: 150, ...bwLoad(ctx, 0.25, '~25% bodyweight'), cue: 'Jump as high as possible' },
              a.trainingAge === 'beginner' || a.ageBand === 'youth'
                ? { id: 'kb-swing', name: 'Kettlebell swing', kind: 'reps', sets: s, reps: 6, restSec: 90 }
                : { id: 'clean', name: 'Hang power clean', kind: 'reps', sets: s, reps: 3, restSec: 150, ...bwLoad(ctx, 0.6, 'fast bar'), cue: 'Fast elbows, land in a quarter squat' },
              { id: 'mb-rot', name: 'Med ball rotational throw', kind: 'reps', sets: 3, reps: 5, perSide: true, restSec: 60, cue: 'Like striking or kicking through the ball' },
            ]
          : [
              { id: 'sq-jump', name: 'Squat jump (pause at the bottom)', kind: 'reps', sets: s, reps: 4, restSec: 90 },
              { id: 'split-jump', name: 'Split jump', kind: 'reps', sets: setsFor(ctx, 3), reps: 4, perSide: true, restSec: 75 },
              { id: 'expl-pushup', name: 'Explosive push-up', kind: 'reps', sets: 3, reps: 5, restSec: 75 },
            ],
      },
      resilience(ctx),
    ],
  }
}

export function fullBodyStrength(ctx: Ctx, variant: 'A' | 'B'): ProgramSession {
  const gym = ctx.equipment === 'gym'
  const s = setsFor(ctx, 4)
  const reps = prog(ctx, [8, 6, 5])
  const a = variant === 'A'
  return {
    key: `fullbody-${variant}`,
    title: `Full body strength ${variant}`,
    category: 'gym',
    minutes: 60,
    targetRpe: 7,
    intensity: 'high',
    legHeavy: true,
    why: 'Strength is the base for speed, power and resilience, and it wins you the contact and aerial contests.',
    blocks: [
      {
        name: 'Main lifts',
        items: gym
          ? [
              a
                ? { id: 'squat', name: 'Back squat', kind: 'reps', sets: s, reps, restSec: 180, ...loadFor(ctx, 'squat', reps) }
                : { id: 'trapbar', name: 'Trap bar deadlift', kind: 'reps', sets: s, reps, restSec: 180, ...loadFor(ctx, 'trapbar', reps), hinge: true },
              a
                ? { id: 'bench', name: 'Bench press', kind: 'reps', sets: s, reps, restSec: 150, ...loadFor(ctx, 'bench', reps) }
                : { id: 'ohp', name: 'Overhead press', kind: 'reps', sets: s, reps, restSec: 150, ...loadFor(ctx, 'press', reps) },
              a
                ? { id: 'chin', name: 'Chin-ups', kind: 'reps', sets: s, reps: 6, restSec: 120 }
                : { id: 'row', name: 'Bent-over row', kind: 'reps', sets: s, reps: 8, restSec: 120, ...loadFor(ctx, 'row', 8) },
            ]
          : [
              a
                ? { id: 'goblet', name: 'Backpack goblet squat', kind: 'reps', sets: s, reps: 12, restSec: 90 }
                : { id: 'slrdl', name: 'Single-leg RDL', kind: 'reps', sets: s, reps: 10, perSide: true, restSec: 75, hinge: true },
              a ? { id: 'pushup', name: 'Push-ups (feet up as you progress)', kind: 'reps', sets: s, reps: 12, restSec: 75 } : { id: 'pike', name: 'Pike push-up', kind: 'reps', sets: s, reps: 8, restSec: 75 },
              a ? { id: 'inv-row', name: 'Inverted row (under a table)', kind: 'reps', sets: s, reps: 10, restSec: 75 } : { id: 'towel-row', name: 'Towel row', kind: 'reps', sets: s, reps: 12, restSec: 60 },
            ],
      },
      {
        name: 'Accessory',
        items: [
          a ? { id: 'walk-lunge', name: 'Walking lunge', kind: 'reps', sets: setsFor(ctx, 2), reps: 8, perSide: true, restSec: 75 } : { id: 'stepup', name: 'Step-up', kind: 'reps', sets: setsFor(ctx, 2), reps: 8, perSide: true, restSec: 75 },
          { id: 'pallof', name: 'Pallof press', kind: 'reps', sets: 2, reps: 10, perSide: true, restSec: 45 },
        ],
      },
      a || ctx.athlete.prevHamstring
        ? resilience(ctx)
        : {
            name: 'Trunk',
            items: [
              { id: 'side-plank', name: 'Side plank', kind: 'hold', sets: 2, seconds: 30, perSide: true, restSec: 30 },
              { id: 'deadbug', name: 'Dead bug', kind: 'reps', sets: 2, reps: 8, perSide: true, restSec: 30 },
            ],
          },
    ],
  }
}

export function upperAndCore(ctx: Ctx): ProgramSession {
  const gym = ctx.equipment === 'gym'
  return {
    key: 'upper',
    title: 'Upper body & trunk',
    category: 'gym',
    minutes: 40,
    targetRpe: 6,
    intensity: 'moderate',
    legHeavy: false,
    why: 'Upper-body strength helps you hold off tackles and protect the ball.',
    blocks: [
      {
        name: 'Upper body',
        items: gym
          ? [
              { id: 'db-bench', name: 'Dumbbell bench press', kind: 'reps', sets: setsFor(ctx, 3), reps: 8, restSec: 90 },
              { id: 'pulldown', name: 'Chin-ups / lat pulldown', kind: 'reps', sets: setsFor(ctx, 3), reps: 8, restSec: 90 },
              { id: 'landmine', name: 'Half-kneeling landmine press', kind: 'reps', sets: 2, reps: 8, perSide: true, restSec: 60 },
            ]
          : [
              { id: 'pushup', name: 'Push-ups', kind: 'reps', sets: 3, reps: 15, restSec: 60 },
              { id: 'inv-row', name: 'Inverted row', kind: 'reps', sets: 3, reps: 10, restSec: 60 },
            ],
      },
      {
        name: 'Trunk',
        items: [
          { id: 'pallof', name: 'Pallof press', kind: 'reps', sets: 2, reps: 10, perSide: true, restSec: 45 },
          { id: 'side-plank', name: 'Side plank', kind: 'hold', sets: 2, seconds: 30, perSide: true, restSec: 30 },
        ],
      },
    ],
  }
}

// ---------- conditioning ----------

export function tempoRuns(ctx: Ctx): ProgramSession {
  const reps = ctx.deload ? 6 : prog(ctx, [8, 10, 12]) + (ctx.athlete.position === 'midfield' ? 2 : 0)
  return {
    key: 'tempo',
    title: 'Aerobic tempo runs',
    category: 'conditioning',
    minutes: 35,
    targetRpe: 6,
    intensity: 'moderate',
    legHeavy: false,
    why: 'Builds the aerobic engine that lets you recover between efforts, without hammering your legs.',
    blocks: [
      { name: 'Warm-up', items: [drill('jog', 'Jog + dynamic stretches', '8 min')] },
      { name: 'Tempo', items: [{ id: 'tempo100', name: '100m at ~70% speed', kind: 'sprint', sets: reps, distance: 100, restSec: 45, cue: 'Comfortable and controlled, never a sprint. Walk 50m back.' }] },
      coolDown(),
    ],
  }
}

export function repeatSprints(ctx: Ctx): ProgramSession {
  const pos = ctx.athlete.position
  const dist = pos === 'midfield' || pos === 'halfforward' ? 40 : pos === 'fullforward' || pos === 'fullback' ? 20 : 25
  const setsN = ctx.deload ? 1 : prog(ctx, [2, 2, 3])
  return {
    key: 'rsa',
    title: 'Repeat-sprint conditioning',
    category: 'conditioning',
    minutes: 40,
    targetRpe: 8,
    intensity: 'high',
    legHeavy: false,
    why: `Gaelic games are repeated hard efforts. This trains you to keep sprinting late in a game${pos !== 'unknown' ? `. Distances suit the ${POSITION_LABEL[pos].toLowerCase()}` : ''}.`,
    blocks: [
      speedWarmup(ctx),
      {
        name: 'Repeat sprints',
        items: Array.from({ length: setsN }, (_, i) => ({
          id: `rsa-${i + 1}`,
          name: `Set ${i + 1}: ${dist}m shuttle sprints`,
          kind: 'sprint' as const,
          sets: 6,
          distance: dist,
          restSec: 20,
          cue: i < setsN - 1 ? '4 min easy walk after this set' : undefined,
        })),
      },
      ...(ctx.deload
        ? []
        : [{ name: 'Intervals', items: [{ id: '1515', name: '15s run / 15s walk at ~90%', kind: 'hold' as const, sets: prog(ctx, [1, 2, 2]), seconds: prog(ctx, [360, 360, 480]), restSec: 180 }] }]),
      coolDown(),
    ],
  }
}

// ---------- skills ----------

export function freesSession(ctx: Ctx, n: 1 | 2): ProgramSession {
  const football = ctx.sport === 'football' || ctx.sport === 'lgfa'
  const strike = football ? 'kicks' : 'strikes'
  const total = ctx.deload ? 25 : prog(ctx, [30, 40, 45])
  const keeper = ctx.athlete.position === 'goalkeeper'
  return {
    key: `frees-${n}`,
    title: n === 1 ? 'Free-taking: routine & range' : 'Free-taking: pressure',
    category: 'skills',
    minutes: 40,
    targetRpe: 4,
    intensity: 'low',
    legHeavy: false,
    why: `Accuracy comes from a repeatable routine. Cap it around ${total} ${strike} to protect your hips and groin, and log every attempt on the pitch.`,
    blocks: [
      { name: 'Warm-up', items: [drill('short', `Short ${strike} from 20m, centre`, '8 easy')] },
      n === 1
        ? {
            name: 'Routine & range',
            items: [
              drill('routine', 'Same pre-shot routine every time', 'Steps, breath, pick a target', 'Write it down. Never change it mid-session.'),
              { id: 'c25', name: 'Centre, 25m', kind: 'reps', sets: 1, reps: 10, restSec: 0 },
              { id: 'ang30', name: 'Angles, 30m', kind: 'reps', sets: 1, reps: 5, perSide: true, restSec: 0 },
              { id: 'long', name: football ? '45s / outside the 40m arc' : '65s and long-range frees', kind: 'reps', sets: 1, reps: ctx.step >= 1 ? 10 : 6, restSec: 0 },
              ...(keeper ? [{ id: 'restarts', name: football ? 'Kickouts to target zones' : 'Puckouts to target zones', kind: 'reps' as const, sets: 1, reps: 15, restSec: 0 }] : []),
            ],
          }
        : {
            name: 'Pressure games',
            items: [
              drill('atw', 'Around the world', '7 spots, must score to move on'),
              drill('three', 'Three in a row', 'From your weakest spot'),
              { id: 'fatigue', name: '20m sprint, then take a free', kind: 'reps', sets: 5, reps: 1, restSec: 60, cue: 'Practise with tired legs, like a match' },
            ],
          },
      ...(n === 1 ? [resilience(ctx)] : []),
    ],
  }
}

export function ballSkillsSession(ctx: Ctx, n: 1 | 2): ProgramSession {
  const hurling = ctx.sport === 'hurling' || ctx.sport === 'camogie'
  const items: Item[] = hurling
    ? n === 1
      ? [
          drill('wall-r', 'Wall ball: strike & catch, right side', '5 min'),
          drill('wall-l', 'Wall ball: strike & catch, left side', '5 min', 'Give your weak side equal time'),
          drill('trap', 'First touch: drop & trap, roll lift', '3 × 20 each'),
          drill('hp', 'Hand pass to the wall, both hands', '3 × 20'),
          drill('solo-strike', 'Solo 30m, strike on the run', '10 each side'),
        ]
      : [
          drill('overhead', 'Overhead catch off high wall rebounds', '3 × 15'),
          drill('ground', 'Ground strike to the wall, both sides', '3 × 20'),
          drill('pickup', 'Pick-up at speed', '10 × 20m'),
          drill('turn', 'Striking for points on the turn', '10 each side'),
        ]
    : n === 1
      ? [
          drill('weak-kick', 'Kick-pass to wall or partner, weak foot', '3 × 15', 'Do your weak foot first, while you are fresh'),
          drill('solo-hop', 'Solo & hop, change hands', '4 × 40m'),
          drill('fist', 'Fist pass, both hands', '3 × 20'),
          drill('catch', 'High catch off rebounds', '3 × 10'),
          drill('shoot', 'Shooting from play, both feet', '10 each foot'),
        ]
      : [
          drill('pickup', 'Pick-up at speed (toe-tap)', '10 × 20m'),
          drill('sidestep', 'Side-step & shoot', '8 each side'),
          drill('hp-pressure', 'Hand-pass under pressure (partner)', '3 × 1 min'),
          drill('weak-points', 'Weak-foot points from 25–30m', '10'),
        ]
  return {
    key: `skills-${n}`,
    title: n === 1 ? 'Ball skills: both sides' : 'Ball skills: game speed',
    category: 'skills',
    minutes: 35,
    targetRpe: 4,
    intensity: 'low',
    legHeavy: false,
    why: 'Skill improves with short, frequent sessions and lots of quality touches, especially on your weaker side.',
    blocks: [{ name: 'Skills', items }, ...(n === 1 ? [resilience(ctx)] : [])],
  }
}

// ---------- hamstring resilience ----------

export function hamstringGym(ctx: Ctx): ProgramSession {
  const gym = ctx.equipment === 'gym'
  return {
    key: 'ham-strength',
    title: 'Hamstring & posterior chain',
    category: 'gym',
    minutes: 40,
    targetRpe: 6,
    intensity: 'moderate',
    legHeavy: true,
    why: 'Eccentric strength (Nordics) and hip-hinge strength are the best-supported ways to reduce hamstring strains.',
    blocks: [
      {
        name: 'Isometrics',
        items: [
          { id: 'bridge-iso', name: 'Single-leg bridge hold (heel on bench)', kind: 'hold', sets: 3, seconds: 30, perSide: true, restSec: 45 },
          { id: 'long-bridge', name: 'Long-lever hamstring bridge hold', kind: 'hold', sets: 2, seconds: 20, perSide: true, restSec: 45, hinge: true },
        ],
      },
      {
        name: 'Strength',
        items: [
          gym
            ? { id: 'rdl', name: 'Romanian deadlift', kind: 'reps', sets: setsFor(ctx, 3), reps: 8, restSec: 120, ...loadFor(ctx, 'rdl', 8), cue: '3 seconds on the way down', hinge: true }
            : { id: 'slrdl', name: 'Single-leg RDL (backpack)', kind: 'reps', sets: setsFor(ctx, 3), reps: 8, perSide: true, restSec: 75, cue: '3 seconds on the way down', hinge: true },
          gym
            ? { id: 'thrust', name: 'Hip thrust', kind: 'reps', sets: setsFor(ctx, 3), reps: 10, restSec: 90, ...loadFor(ctx, 'hipthrust', 10) }
            : { id: 'slthrust', name: 'Single-leg hip thrust', kind: 'reps', sets: setsFor(ctx, 3), reps: 10, perSide: true, restSec: 60 },
          { id: 'slider', name: 'Slider / towel hamstring curl', kind: 'reps', sets: 2, reps: 8, restSec: 60, hinge: true },
        ],
      },
      resilience(ctx),
    ],
  }
}

export function sprintExposure(ctx: Ctx): ProgramSession {
  const pct = ctx.deload ? '80%' : prog(ctx, ['80%', '85–90%', '90–95%'])
  return {
    key: 'ham-speed',
    title: 'Graded sprint exposure',
    category: 'speed',
    minutes: 30,
    targetRpe: 6,
    intensity: 'moderate',
    legHeavy: false,
    why: 'Hamstrings get injured at high speed, so they need to be trained at high speed. Build it up gradually.',
    blocks: [
      speedWarmup(ctx),
      {
        name: 'Strides',
        items: [
          { id: 'strides', name: `Strides at ${pct}`, kind: 'sprint', sets: ctx.deload ? 4 : prog(ctx, [5, 6, 6]), distance: 60, restSec: 90, maxSpeed: ctx.step >= 1 && !ctx.deload, cue: 'Walk back between reps' },
          { id: 'acc20', name: 'Acceleration', kind: 'sprint', sets: 3, distance: 20, restSec: 90 },
        ],
      },
      coolDown(),
    ],
  }
}

// ---------- recovery / substitutions ----------

const mobility = (): Block => ({
  name: 'Mobility',
  items: [
    { id: '9090', name: '90/90 hip switches', kind: 'reps', sets: 2, reps: 8, restSec: 0 },
    { id: 'couch', name: 'Couch stretch', kind: 'hold', sets: 1, seconds: 45, perSide: true, restSec: 0 },
    { id: 'tspine', name: 'Thoracic rotations', kind: 'reps', sets: 1, reps: 8, perSide: true, restSec: 0 },
    drill('breath', 'Box breathing', '2 min'),
  ],
})

export function recoverySession(): ProgramSession {
  return {
    key: 'recovery',
    title: 'Recovery session',
    category: 'recovery',
    minutes: 25,
    targetRpe: 2,
    intensity: 'low',
    legHeavy: false,
    why: 'Fitness is built while you recover from training, not during it.',
    blocks: [{ name: 'Easy movement', items: [drill('easy', 'Bike, swim or walk', '15 min at easy conversation pace')] }, mobility()],
  }
}

export function techniqueSession(): ProgramSession {
  return {
    key: 'technique',
    title: 'Running technique & mobility',
    category: 'recovery',
    minutes: 30,
    targetRpe: 3,
    intensity: 'low',
    legHeavy: false,
    why: 'Keeps your running pattern sharp without putting a tight muscle at risk.',
    blocks: [
      {
        name: 'Technique (easy)',
        items: [
          drill('jog', 'Easy jog', '5 min'),
          drill('a-march', 'A-march', '3 × 20m', 'Smooth, nothing forced'),
          { id: 'relaxed', name: 'Relaxed strides at 60–70%', kind: 'sprint', sets: 4, distance: 40, restSec: 60, cue: 'Stop if you feel the tightness' },
        ],
      },
      mobility(),
    ],
  }
}

export function protectSession(ctx: Ctx): ProgramSession {
  const u = upperAndCore(ctx)
  return { ...u, key: 'protect', title: 'Upper body + mobility (no leg loading)', why: 'Keeps you training without stressing a tight or painful area.', blocks: [...u.blocks, mobility()] }
}

// ---------- goals ----------

export interface GoalDef {
  type: GoalType
  title: string
  short: string
  blurb: string
  tests: BenchmarkTest[]
  sessions: (ctx: Ctx) => ProgramSession[]
  defaultWeeks: number
}

export const GOALS: Record<GoalType, GoalDef> = {
  speed: {
    type: 'speed',
    title: 'Get quicker',
    short: 'Speed',
    blurb: 'Acceleration and top speed: sprint sessions and lower-body strength, with hamstring protection built in.',
    tests: ['sprint10', 'sprint20', 'flying20'],
    defaultWeeks: 8,
    sessions: ctx =>
      ctx.phase === 'in'
        ? [inSeasonSpeedSession(ctx), lowerStrength(ctx), ballSkillsSession(ctx, 1)]
        : [accelSession(ctx), lowerStrength(ctx), maxVelocitySession(ctx), upperAndCore(ctx)],
  },
  power: {
    type: 'power',
    title: 'Be more explosive',
    short: 'Explosiveness',
    blurb: 'Jumps, throws and fast lifts to win the first step, the high ball and the shoulder.',
    tests: ['broadJump', 'sprint10'],
    defaultWeeks: 8,
    sessions: ctx =>
      ctx.phase === 'in'
        ? [powerSession(ctx), inSeasonSpeedSession(ctx), upperAndCore(ctx)]
        : [powerSession(ctx), accelSession(ctx), lowerStrength(ctx), upperAndCore(ctx)],
  },
  strength: {
    type: 'strength',
    title: 'Get stronger',
    short: 'Strength',
    blurb: 'Full-body strength sessions so you can hold your ground in contact.',
    tests: ['squat3rm', 'broadJump'],
    defaultWeeks: 8,
    sessions: ctx => [fullBodyStrength(ctx, 'A'), fullBodyStrength(ctx, 'B'), upperAndCore(ctx)],
  },
  engine: {
    type: 'engine',
    title: 'Build my fitness',
    short: 'Fitness',
    blurb: 'Aerobic base and repeat-sprint ability so you are still sharp in the last 10 minutes.',
    tests: ['bronco'],
    defaultWeeks: 6,
    sessions: ctx => [tempoRuns(ctx), repeatSprints(ctx), lowerStrength(ctx), upperAndCore(ctx)],
  },
  agility: {
    type: 'agility',
    title: 'Sharper on the turn',
    short: 'Agility',
    blurb: 'Deceleration, cutting and reaction work: beat your marker, or stay with yours.',
    tests: ['agility505', 'sprint10'],
    defaultWeeks: 6,
    sessions: ctx => [agilitySession(ctx), lowerStrength(ctx), ctx.phase === 'in' ? inSeasonSpeedSession(ctx) : accelSession(ctx), upperAndCore(ctx)],
  },
  hamstring: {
    type: 'hamstring',
    title: 'Bulletproof hamstrings',
    short: 'Resilience',
    blurb: 'Nordics, posterior-chain strength and graded sprint exposure. For prevention, not rehab of a current injury.',
    tests: ['flying20'],
    defaultWeeks: 8,
    sessions: ctx => [hamstringGym(ctx), sprintExposure(ctx), upperAndCore(ctx)],
  },
  frees: {
    type: 'frees',
    title: 'Nail my frees',
    short: 'Free-taking',
    blurb: 'A repeatable routine, range work and pressure games, tracked on the pitch screen.',
    tests: ['freesPct'],
    defaultWeeks: 6,
    sessions: ctx => [freesSession(ctx, 1), freesSession(ctx, 2), ballSkillsSession(ctx, 1)],
  },
  skills: {
    type: 'skills',
    title: 'Sharpen my skills',
    short: 'Skills',
    blurb: 'Short, frequent sessions on first touch and your weaker side.',
    tests: [],
    defaultWeeks: 6,
    sessions: ctx => [ballSkillsSession(ctx, 1), ballSkillsSession(ctx, 2), freesSession(ctx, 1)],
  },
}

export const POSITION_LABEL: Record<Position, string> = {
  goalkeeper: 'Goalkeeper',
  fullback: 'Full-back line',
  halfback: 'Half-back line',
  midfield: 'Midfield',
  halfforward: 'Half-forward line',
  fullforward: 'Full-forward line',
  unknown: 'Not set',
}

/** Goals that suit a position, best first. */
export const POSITION_GOALS: Record<Position, GoalType[]> = {
  goalkeeper: ['power', 'agility', 'frees'],
  fullback: ['agility', 'speed', 'strength'],
  halfback: ['speed', 'engine', 'agility'],
  midfield: ['engine', 'power', 'strength'],
  halfforward: ['engine', 'speed', 'skills'],
  fullforward: ['speed', 'frees', 'agility'],
  unknown: [],
}

export const BENCHMARKS: Record<BenchmarkTest, { label: string; unit: string; lowerIsBetter: boolean; how: string }> = {
  sprint10: { label: '10m sprint', unit: 's', lowerIsBetter: true, how: 'Standing start, best of 3, full rest. Same surface and timer every time.' },
  sprint20: { label: '20m sprint', unit: 's', lowerIsBetter: true, how: 'Standing start, best of 3.' },
  sprint40: { label: '40m sprint', unit: 's', lowerIsBetter: true, how: 'Standing start, best of 2.' },
  flying20: { label: 'Flying 20m', unit: 's', lowerIsBetter: true, how: '20m run-in, time the next 20m. Best of 3. Shows top speed.' },
  broadJump: { label: 'Standing broad jump', unit: 'cm', lowerIsBetter: false, how: 'Two-foot take-off, stick the landing, measure to the back heel. Best of 3.' },
  agility505: { label: '5-0-5 agility', unit: 's', lowerIsBetter: true, how: 'Sprint 10m, through a 5m gate, turn on the line, back through the gate.' },
  bronco: { label: 'Bronco', unit: 's', lowerIsBetter: true, how: '5 sets of 20m-40m-60m shuttles, no rest. Total time.' },
  squat3rm: { label: 'Squat 3RM', unit: 'kg', lowerIsBetter: false, how: 'Heaviest clean set of 3. Only with experience and a spotter.' },
  freesPct: { label: 'Frees accuracy', unit: '%', lowerIsBetter: false, how: 'Calculated from your free-taking log.' },
}

export const PHASE_LABEL: Record<Phase, string> = { off: 'Off-season', pre: 'Pre-season', in: 'In-season' }

/** Extra sessions per week allowed for this player in this phase. */
export function maxExtraSessions(phase: Phase, a: Athlete, dual = false): number {
  let m = { off: 4, pre: 3, in: 2 }[phase]
  if (a.ageBand === 'youth') m = Math.min(m, phase === 'in' ? 1 : 2)
  if (a.ageBand === 'masters' && phase !== 'off') m -= 1
  if (a.level === 'intercounty' && phase === 'in') m = Math.min(m, 1) // county squads already carry a big load
  if (dual) m -= 1 // dual players carry a higher baseline load from two teams
  return Math.max(1, m)
}

/** Short personalised notes shown on the plan, so the player sees why it looks the way it does. */
export function personalNotes(a: Athlete, p: Profile): string[] {
  const n: string[] = []
  if (isDualPlayer(p)) n.push('Tailored for a dual player: one fewer extra session a week, because playing two codes already adds more base load.')
  if (a.prevHamstring) n.push('Recent hamstring injury: Nordics in every gym session, a longer warm-up and a slower build to top speed.')
  if (a.prevGroin) n.push('Recent groin injury: Copenhagen planks start on the short lever.')
  if (a.prevCalf || a.ageBand === 'masters') n.push('Extra calf and Achilles work in your warm-ups.')
  if (a.ageBand === 'youth') n.push('Under 18: technique-first loading, no max testing and fewer extra sessions.')
  if (a.ageBand === 'masters') n.push('30+: one fewer extra session a week, with more recovery between hard days.')
  if (a.trainingAge === 'beginner') n.push('New to the gym: fewer sets and simpler lifts while you learn the movements.')
  if (a.level === 'intercounty') n.push('Inter-county: in-season extras are capped because squad training is already heavy.')
  if (a.weightKg) n.push(`Starting weights are estimated from your ${a.weightKg} kg bodyweight. Adjust them on the day to RPE 7–8.`)
  if (p.position !== 'unknown') n.push(`Conditioning and agility drills are tuned for the ${POSITION_LABEL[p.position].toLowerCase()}.`)
  return n
}

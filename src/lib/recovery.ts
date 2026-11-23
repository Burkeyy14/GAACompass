// Daily wellness → recovery score. Same formula as the FYP Android app,
// with the explanation testers asked for, plus a tightness/pain override.

import type { CheckIn } from './types'
import { addDays } from './dates'

export function recoveryScore(c: Pick<CheckIn, 'sleep' | 'energy' | 'soreness' | 'stress' | 'rpe'>): number {
  const raw = (c.sleep + c.energy + (10 - c.soreness) + (10 - c.stress) + (10 - c.rpe)) / 5
  return Math.round(Math.max(0, Math.min(10, raw)) * 10) / 10
}

export type Readiness = 'green' | 'amber' | 'red' | 'stop'

export interface ReadinessResult {
  score: number
  level: Readiness
  headline: string
  advice: string
  reasons: string[]
}

const HIGH_RISK_AREAS = ['hamstring', 'groin', 'calf', 'quad']

export function readiness(c: CheckIn, history: CheckIn[] = []): ReadinessResult {
  const score = recoveryScore(c)
  const reasons: string[] = []
  let level: Readiness = score >= 8 ? 'green' : score >= 6 ? 'amber' : 'red'

  if (c.sleep <= 4) reasons.push('Poor sleep')
  if (c.energy <= 4) reasons.push('Low energy')
  if (c.soreness >= 7) reasons.push('High muscle soreness')
  if (c.stress >= 7) reasons.push('High stress')
  if (c.rpe >= 8) reasons.push('Very hard session yesterday')

  // Tightness / pain overrides the score — this is the "hamstring rule".
  if (c.tightness === 'sharp') {
    level = 'stop'
    reasons.unshift('Sharp pain or tightness reported')
  } else if (c.tightness === 'mild') {
    const risky = c.areas.some(a => HIGH_RISK_AREAS.includes(a))
    if (risky) {
      if (level === 'green') level = 'amber'
      reasons.unshift(`Tightness in ${c.areas.join(', ')}`)
    } else {
      reasons.unshift(`Mild tightness (${c.areas.join(', ') || 'unspecified'})`)
    }
  }

  // Trend: three days in a row below 6 → push towards rest
  const prev = [1, 2].map(n => history.find(h => h.date === addDays(c.date, -n)))
  if (score < 6 && prev.every(p => p && recoveryScore(p) < 6)) {
    if (level === 'amber') level = 'red'
    reasons.push('Recovery below 6 for 3 days running')
  }

  const copy: Record<Readiness, [string, string]> = {
    green: ['Good to go', 'Recovery looks strong. Train as planned.'],
    amber: ['Train, but manage it', 'Do the session but trim volume by about a third, keep effort ≤ 7/10 and skip max-speed sprinting.'],
    red: ['Back off today', 'Swap hard work for recovery: easy movement, mobility, low-intensity skills, or rest.'],
    stop: ['No sprinting or leg loading today', 'Sharp pain or tightness is a warning sign. Avoid sprinting, kicking/striking at full effort and heavy leg work. If it hurts to walk, stretch or contract the muscle, get it assessed by a physio before training.'],
  }
  const [headline, advice] = copy[level]
  return { score, level, headline, advice, reasons }
}

export const RECOVERY_EXPLAINER = `Your recovery score is the average of five 0–10 ratings:
• Sleep quality (higher is better)
• Energy (higher is better)
• 10 − muscle soreness
• 10 − stress
• 10 − yesterday's session effort (RPE)

8+ = train as planned · 6–7.9 = train but manage the load · below 6 = recovery or rest.

Any tightness in a hamstring, groin, calf or quad caps you at "manage it", and sharp pain stops sprinting and leg loading regardless of the score. Three low days in a row pushes you towards rest.

Self-reported wellness like this is one of the most sensitive early warnings of overtraining (Saw et al., 2016). It's a guide, not a diagnosis.`

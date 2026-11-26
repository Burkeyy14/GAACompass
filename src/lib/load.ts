// Planned weekly load (from the FYP planner rules) and actual load from logged sessions.

import type { DayActivity, SessionLog } from './types'
import { addDays, daysBetween } from './dates'

export const ACTIVITY_META: Record<DayActivity, { label: string; weight: number; intense: boolean }> = {
  rest: { label: 'Rest', weight: 0, intense: false },
  recovery: { label: 'Recovery', weight: 0.5, intense: false },
  skills: { label: 'Skills', weight: 1, intense: false },
  gym: { label: 'Gym', weight: 1.5, intense: true },
  speed: { label: 'Speed', weight: 1.5, intense: true },
  conditioning: { label: 'Running', weight: 1.5, intense: true },
  pitch: { label: 'Club training', weight: 2, intense: true },
  match: { label: 'Match', weight: 3, intense: true },
}

export const ACTIVITY_ORDER: DayActivity[] = ['pitch', 'match', 'gym', 'speed', 'conditioning', 'skills', 'recovery', 'rest']

export interface Flag {
  level: 'red' | 'amber'
  text: string
}

export interface PlanFeedback {
  score: number
  band: 'under' | 'optimal' | 'high' | 'overload'
  headline: string
  flags: Flag[]
}

export function planFeedback(days: DayActivity[][], isDualPlayer = false): PlanFeedback {
  const score = days.reduce((s, d) => s + d.reduce((a, act) => a + ACTIVITY_META[act].weight, 0), 0)
  const band = score <= 5 ? 'under' : score <= 10 ? 'optimal' : score <= 13 ? 'high' : 'overload'
  const headline = {
    under: 'Light week. Fine for a deload, but not enough to progress.',
    optimal: 'Balanced week. Good mix of work and recovery.',
    high: 'High load. Watch your check-ins closely this week.',
    overload: 'Overload risk. This is likely more than you can recover from.',
  }[band]

  const flags: Flag[] = []
  const has = (i: number, a: DayActivity) => days[i]?.includes(a)
  const isEasy = (i: number) => days[i].length === 0 || days[i].every(a => a === 'rest' || a === 'recovery')
  const isIntense = (i: number) => days[i].some(a => ACTIVITY_META[a].intense)

  const matches = days.filter(d => d.includes('match')).length
  const easyDays = days.filter((_, i) => isEasy(i)).length

  if (matches > 2) flags.push({ level: 'red', text: `${matches} matches planned. That is a very high match load.` })
  else if (matches === 2) {
    if (isDualPlayer && easyDays < 2) {
      flags.push({ level: 'red', text: 'Dual player with two match days this week and fewer than 2 rest days. Add a rest or recovery day.' })
    } else {
      flags.push({ level: 'amber', text: 'Two matches this week. Keep everything else light.' })
    }
  }
  if (easyDays === 0) flags.push({ level: 'red', text: 'No rest or recovery day at all this week.' })
  else if (easyDays < 2) flags.push({ level: 'red', text: 'Fewer than two rest/recovery days.' })

  for (let i = 0; i < 6; i++) {
    if (has(i, 'match') && has(i + 1, 'match')) flags.push({ level: 'red', text: 'Back-to-back match days.' })
    if (has(i, 'match') && isIntense(i + 1)) flags.push({ level: 'red', text: 'Hard session the day after a match. Make that a recovery day.' })
    if (has(i + 1, 'match') && (has(i, 'gym') || has(i, 'speed') || has(i, 'conditioning') || (has(i, 'pitch') && days[i].length > 1)))
      flags.push({ level: 'amber', text: 'Heavy work the day before a match. Keep it light.' })
  }

  let run = 0
  let maxRun = 0
  for (let i = 0; i < 7; i++) {
    run = isIntense(i) ? run + 1 : 0
    maxRun = Math.max(maxRun, run)
  }
  if (maxRun > 3) flags.push({ level: 'amber', text: `${maxRun} high-intensity days in a row.` })

  const speedDays = days.filter(d => d.includes('speed')).length
  if (speedDays > 2) flags.push({ level: 'amber', text: "More than two speed sessions. Sprint quality drops when you're tired." })

  // dedupe
  const seen = new Set<string>()
  return { score, band, headline, flags: flags.filter(f => (seen.has(f.text) ? false : (seen.add(f.text), true))) }
}

// ---------- Actual load (session RPE × minutes) ----------

export const sessionLoad = (s: SessionLog) => s.minutes * s.rpe

export function loadInWindow(sessions: SessionLog[], endISO: string, days: number): number {
  return sessions
    .filter(s => {
      const d = daysBetween(s.date, endISO)
      return d >= 0 && d < days
    })
    .reduce((t, s) => t + sessionLoad(s), 0)
}

export interface LoadStatus {
  acute: number // last 7 days
  chronicWeekly: number // average weekly load over last 28 days
  ratio: number | null
  level: 'building' | 'low' | 'good' | 'caution' | 'spike'
  message: string
}

/**
 * Acute:chronic comparison. Used as a simple "have I suddenly jumped my load?" check.
 * Needs ~3 weeks of logs before it says anything.
 */
export function loadStatus(sessions: SessionLog[], todayISO: string): LoadStatus {
  const acute = loadInWindow(sessions, todayISO, 7)
  const chronicWeekly = loadInWindow(sessions, todayISO, 28) / 4
  const first = sessions.reduce<string | null>((m, s) => (m === null || s.date < m ? s.date : m), null)
  const history = first ? daysBetween(first, todayISO) : 0

  if (history < 21 || chronicWeekly === 0) {
    return { acute, chronicWeekly, ratio: null, level: 'building', message: 'Log sessions for 3 weeks and we can spot dangerous load jumps for you.' }
  }
  const ratio = Math.round((acute / chronicWeekly) * 100) / 100
  if (ratio > 1.5) return { acute, chronicWeekly, ratio, level: 'spike', message: 'This week is over 50% above your usual. Spikes like this are linked with soft-tissue injuries, so ease off.' }
  if (ratio > 1.3) return { acute, chronicWeekly, ratio, level: 'caution', message: 'Load is climbing quickly. Hold here rather than adding more.' }
  if (ratio < 0.8) return { acute, chronicWeekly, ratio, level: 'low', message: 'Lighter than usual. Fine for a deload; build back up gradually.' }
  return { acute, chronicWeekly, ratio, level: 'good', message: 'Load is in line with what you are used to.' }
}

export function weeklyLoads(sessions: SessionLog[], mondayISO: string, weeks: number): { weekStart: string; load: number }[] {
  const out = []
  for (let w = weeks - 1; w >= 0; w--) {
    const start = addDays(mondayISO, -7 * w)
    out.push({ weekStart: start, load: loadInWindow(sessions, addDays(start, 6), 7) })
  }
  return out
}

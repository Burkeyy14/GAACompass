// Turns a goal + the player's weekly schedule into a week-by-week plan,
// and adapts today's session to their check-in (auto-regulation).

import type { CheckIn, DayActivity, Goal, Profile, SessionCategory, Sport } from './types'
import type { Ctx, ProgramSession } from './programs'
import { GOALS, athleteFrom, isDualPlayer, maxExtraSessions, primarySport, protectSession, recoverySession, techniqueSession } from './programs'
import { addDays, daysBetween, weekday } from './dates'
import type { LoadStatus } from './load'
import type { ReadinessResult } from './recovery'

export interface ScheduledSession {
  day: number // 0 = Mon
  session: ProgramSession
}

export interface PlanWeek {
  week: number
  weekStart: string
  theme: string
  deload: boolean
  testWeek: boolean
  sessions: ScheduledSession[]
}


export function weekCtx(goal: Goal, profile: Profile, week: number): Ctx {
  const pos = (week - 1) % 4
  // every 4th week is a deload (lighter) week — also a good week to retest
  const deload = pos === 3
  // frees/skills goals may be tied to a specific code; fall back to primary sport
  const sport: Sport = goal.sport ?? primarySport(profile)
  return { step: Math.min(pos, 2), deload, week, equipment: goal.equipment, phase: goal.phase, sport, athlete: athleteFrom(profile) }
}

function themeFor(ctx: Ctx, week: number, total: number): string {
  if (week === 1) return 'Baseline: learn the movements and test yourself'
  if (week === total) return 'Final week: retest and see your progress'
  if (ctx.deload) return 'Deload: lower volume so your body adapts'
  return ['Build', 'Build: a bit more', 'Peak week of the block'][ctx.step]
}

export type DayKind = 'match' | 'md+1' | 'md-1' | 'club' | 'free'

export function dayKinds(profile: Profile): DayKind[] {
  const teams = profile.teams?.length ? profile.teams : [{ sport: profile.sport, trainingDays: profile.clubTrainingDays, matchDay: profile.matchDay }]
  const matchDays = teams.map(t => t.matchDay).filter((md): md is number => md !== null)
  const trainingDays = [...new Set(teams.flatMap(t => t.trainingDays))]
  return Array.from({ length: 7 }, (_, d) => {
    if (matchDays.includes(d)) return 'match'
    if (matchDays.some(md => (md + 1) % 7 === d)) return 'md+1'
    if (matchDays.some(md => (md + 6) % 7 === d)) return 'md-1'
    if (trainingDays.includes(d)) return 'club'
    return 'free'
  })
}

/** Sport that trains or plays on the given day index (0=Mon), or null if ambiguous / none. */
export function sportForDay(profile: Profile, day: number): Sport | null {
  const teams = profile.teams?.length ? profile.teams : []
  const matchTeams = teams.filter(t => t.matchDay === day)
  if (matchTeams.length === 1) return matchTeams[0].sport
  const trainTeams = teams.filter(t => t.trainingDays.includes(day))
  if (trainTeams.length === 1) return trainTeams[0].sport
  return null
}

/** Greedy scheduler: put each session on the most suitable day. */
export function scheduleWeek(sessions: ProgramSession[], profile: Profile): ScheduledSession[] {
  const kinds = dayKinds(profile)
  const placed: ScheduledSession[] = []
  const on = (d: number) => placed.filter(p => p.day === d).map(p => p.session)

  for (const s of sessions) {
    let best = -1
    let bestScore = -Infinity
    for (let d = 0; d < 7; d++) {
      const k = kinds[d]
      const here = on(d)
      let score = 0
      if (k === 'match') continue
      if (k === 'md+1' && s.category !== 'recovery') continue
      if (k === 'md-1' && s.intensity !== 'low') continue
      if (here.length >= 2) continue
      if (here.some(h => h.intensity === 'high') && s.intensity === 'high') score -= 4
      score -= here.length * 3
      if (here.some(h => h.category === s.category)) score -= 6

      if (k === 'club') {
        // "keep hard days hard": gym stacks well after club training, speed/conditioning don't
        if (s.category === 'gym') score += 1
        if (s.category === 'speed') score -= 2
        if (s.category === 'conditioning') score -= 5
        if (s.category === 'skills') score -= 1
      } else if (k === 'free') {
        score += s.category === 'speed' ? 3 : 1
      }

      const prev = on((d + 6) % 7)
      const next = on((d + 1) % 7)
      // Sprint fresh: not the day after heavy legs or a match
      if (s.category === 'speed' && (prev.some(p => p.legHeavy) || kinds[(d + 6) % 7] === 'match')) score -= 3
      if (s.legHeavy && next.some(n => n.category === 'speed')) score -= 3
      // Avoid long runs of hard days (the planner flags more than 3 in a row)
      if (s.intensity !== 'low') {
        const hard = (i: number) => i === d || kinds[i] === 'club' || kinds[i] === 'match' || on(i).some(p => p.intensity !== 'low')
        let run = 0
        let maxRun = 0
        for (let i = 0; i < 7; i++) {
          run = hard(i) ? run + 1 : 0
          maxRun = Math.max(maxRun, run)
        }
        if (maxRun > 3) score -= 4
      }
      // Don't put two leg-heavy days back to back
      if (s.legHeavy && [...prev, ...next].some(p => p.legHeavy)) score -= 3
      // Spread same categories out
      if ([...prev, ...next].some(p => p.category === s.category)) score -= 2
      // Speed early in the week is better than straight after club sessions
      if (s.category === 'speed' && kinds[(d + 6) % 7] === 'club') score -= 1

      if (score > bestScore) {
        bestScore = score
        best = d
      }
    }
    if (best >= 0) placed.push({ day: best, session: s })
  }
  return placed.sort((a, b) => a.day - b.day)
}

export function generatePlan(goal: Goal, profile: Profile): PlanWeek[] {
  const def = GOALS[goal.type]
  const n = Math.max(1, Math.min(goal.extraSessions, maxExtraSessions(goal.phase, athleteFrom(profile), isDualPlayer(profile))))
  const weeks: PlanWeek[] = []
  for (let w = 1; w <= goal.weeks; w++) {
    const ctx = weekCtx(goal, profile, w)
    const chosen = def.sessions(ctx).slice(0, ctx.deload ? Math.max(1, n - 1) : n)
    weeks.push({
      week: w,
      weekStart: addDays(goal.startDate, 7 * (w - 1)),
      theme: themeFor(ctx, w, goal.weeks),
      deload: ctx.deload,
      testWeek: def.tests.length > 0 && (w === 1 || w === goal.weeks),
      sessions: scheduleWeek(chosen, profile),
    })
  }
  return weeks
}

export function currentWeekIndex(goal: Goal, dateISO: string): number | null {
  const d = daysBetween(goal.startDate, dateISO)
  if (d < 0) return null
  const w = Math.floor(d / 7) + 1
  return w > goal.weeks ? null : w
}

export interface TodayItem {
  goal: Goal
  week: PlanWeek
  session: ProgramSession
  ref: string
}

export function sessionsForDate(goals: Goal[], profile: Profile, dateISO: string): TodayItem[] {
  const out: TodayItem[] = []
  for (const g of goals.filter(g => g.active)) {
    const wi = currentWeekIndex(g, dateISO)
    if (!wi) continue
    const week = generatePlan(g, profile)[wi - 1]
    for (const s of week.sessions.filter(s => s.day === weekday(dateISO))) {
      out.push({ goal: g, week, session: s.session, ref: `${g.id}:${wi}:${s.session.key}` })
    }
  }
  return out
}

/** Planner activities implied by the schedule + plans for a week. */
export const CATEGORY_ACTIVITY: Record<SessionCategory, DayActivity> = {
  gym: 'gym', speed: 'speed', skills: 'skills', conditioning: 'conditioning', recovery: 'recovery', pitch: 'pitch', match: 'match',
}

export function suggestedWeekDays(goals: Goal[], profile: Profile, mondayISO: string): DayActivity[][] {
  const kinds = dayKinds(profile)
  const days: DayActivity[][] = kinds.map(k => (k === 'match' ? ['match'] : k === 'md+1' ? ['recovery'] : k === 'club' ? ['pitch'] : []))
  const map = CATEGORY_ACTIVITY
  for (let d = 0; d < 7; d++) {
    for (const item of sessionsForDate(goals, profile, addDays(mondayISO, d))) {
      const a = map[item.session.category]
      if (!days[d].includes(a)) days[d].push(a)
    }
    if (days[d].length === 0) days[d] = ['rest']
  }
  return days
}

// ---------- auto-regulation ----------

export interface Adjusted {
  action: 'go' | 'reduce' | 'swap'
  note: string
  session: ProgramSession
}

const HAM_AREAS = ['hamstring', 'groin', 'calf', 'quad']

export function adjustForReadiness(
  s: ProgramSession,
  r: ReadinessResult | null,
  checkin: CheckIn | null,
  load: LoadStatus | null,
  ctx: Ctx,
): Adjusted {
  if (!r || !checkin) return { action: 'go', note: 'Do your check-in so we can adjust this session to how you feel.', session: s }

  const lowerRisk = checkin.tightness !== 'none' && checkin.areas.some(a => HAM_AREAS.includes(a))
  const spike = load?.level === 'spike'

  if (r.level === 'stop') {
    if (s.category === 'skills' && !s.legHeavy) {
      return {
        action: 'reduce',
        note: 'You reported pain: handling and passing only. No full-effort kicking or striking, and no sprinting.',
        session: strip(s, i => !!(i.maxSpeed || i.eccentric || i.plyo)),
      }
    }
    return { action: 'swap', note: 'You reported pain, so this is swapped for a session that avoids loading your legs. Get it checked if it persists.', session: protectSession(ctx) }
  }

  if (r.level === 'red') {
    if (s.intensity === 'low') return { action: 'go', note: 'Recovery is low, but this is a light session. Keep it easy.', session: s }
    return { action: 'swap', note: `Recovery is ${r.score}/10, so today becomes a recovery day. The plan picks up again next session.`, session: recoverySession() }
  }

  const hamstring = checkin.tightness !== 'none' && checkin.areas.includes('hamstring')
  if (lowerRisk && (s.category === 'speed' || s.category === 'conditioning')) {
    return {
      action: 'swap',
      note: `Tightness in your ${checkin.areas.join(', ')} means no sprinting today. This is exactly when strains happen. Do technique and mobility instead, and sprint again once it feels normal.`,
      session: techniqueSession(),
    }
  }

  if (r.level === 'amber' || spike || lowerRisk) {
    const stripped = strip(s, i => !!(i.maxSpeed || (lowerRisk && (i.eccentric || i.plyo)) || (hamstring && i.hinge)))
    const parts = [
      spike ? 'Your load has spiked this week' : `Recovery is ${r.score}/10`,
      lowerRisk ? `and you reported tightness, so no max-speed sprints, Nordics${hamstring ? ', heavy hinges' : ''} or jumps today` : 'so skip max-speed sprinting',
    ]
    return { action: 'reduce', note: parts.join(', ') + '. Drop one set from each exercise and keep effort at 7/10 or below.', session: { ...stripped, targetRpe: Math.min(s.targetRpe, 6), minutes: Math.round(s.minutes * 0.7) } }
  }

  return { action: 'go', note: `Recovery is ${r.score}/10. Go as planned.`, session: s }
}

function strip(s: ProgramSession, drop: (i: ProgramSession['blocks'][number]['items'][number]) => boolean): ProgramSession {
  const blocks = s.blocks
    .map(b => ({ ...b, items: b.items.filter(i => !drop(i)) }))
    .filter(b => b.items.length > 0)
  const removed = s.blocks.flatMap(b => b.items).some(drop)
  if (removed && s.category === 'speed') {
    blocks.push({ name: 'Instead', items: [{ id: 'tech-buildups', name: 'Technique build-ups at 70–80%', kind: 'sprint', sets: 4, distance: 30, restSec: 60, cue: 'Smooth and relaxed, no all-out efforts' }] })
  }
  return { ...s, blocks }
}

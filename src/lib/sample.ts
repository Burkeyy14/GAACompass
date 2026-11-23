// Sample data so a new visitor can explore the app with realistic history.
import type { AppData, CheckIn, FreeAttempt, SessionLog } from './types'
import { addDays, mondayOf, today, uid, weekday } from './dates'
import { emptyData } from './defaults'
import { suggestedWeekDays } from './generator'

function rand(seed: number) {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

export function sampleData(): AppData {
  const r = rand(42)
  const t = today()
  const d = emptyData()
  d.profile = { ...d.profile, name: 'Kevin', age: 22, sex: 'male', heightCm: 183, weightKg: 82, position: 'halfforward', trainingAge: 'intermediate', recentInjuries: ['hamstring'], sport: 'hurling', county: 'clare', clubTrainingDays: [1, 3], matchDay: 6, phase: 'pre', onboarded: true, level: 'senior' }

  const checkins: CheckIn[] = []
  const sessions: SessionLog[] = []
  for (let i = 34; i >= 1; i--) {
    const date = addDays(t, -i)
    const wd = weekday(date)
    const dayAfterMatch = wd === 0
    const late = i < 9 // the last week ramps up — shows a load warning
    if (r() > 0.12) {
      checkins.push({
        id: date,
        date,
        sleep: Math.round(7 + r() * 2.5 - (late ? 1.5 : 0)),
        energy: Math.round(7 + r() * 2.5 - (dayAfterMatch ? 2 : 0) - (late ? 1.5 : 0)),
        soreness: Math.round(1 + r() * 3 + (dayAfterMatch ? 3 : 0) + (late ? 1.5 : 0)),
        stress: Math.round(1.5 + r() * 3),
        rpe: dayAfterMatch ? 8 : [2, 3, 4, 5].includes(wd) ? Math.round(5 + r() * 2) : Math.round(1 + r() * 2),
        tightness: 'none',
        areas: [],
      })
    }
    if (wd === 1 || wd === 3) sessions.push({ id: uid(), date, category: 'pitch', title: 'Club training', minutes: 75, rpe: 7, })
    if (wd === 5 && late) sessions.push({ id: uid(), date, category: 'pitch', title: 'Extra pitch session', minutes: 60, rpe: 7 })
    if (wd === 6) sessions.push({ id: uid(), date, category: 'match', title: 'League match', minutes: 70, rpe: 8 })
    if (wd === 2)
      sessions.push({
        id: uid(), date, category: 'gym', title: 'Lower body strength', minutes: 55, rpe: late ? 8 : 7,
        sets: [1, 2, 3].flatMap(set => [
          { itemId: 'trapbar', name: 'Trap bar deadlift', set, reps: 5, kg: 100 + Math.floor((34 - i) / 7) * 5 },
          { itemId: 'rdl', name: 'Romanian deadlift', set, reps: 8, kg: 60 + Math.floor((34 - i) / 7) * 2.5 },
        ]),
      })
    if (wd === 4 && late) sessions.push({ id: uid(), date, category: 'speed', title: 'Speed top-up', minutes: 30, rpe: 7 })
  }
  d.checkins = checkins
  d.sessions = sessions

  // frees: four sessions improving slightly
  d.frees = [24, 17, 10, 3].map((ago, n) => {
    const attempts: FreeAttempt[] = []
    for (let k = 0; k < 20; k++) {
      const y = 14 + r() * 55
      const x = (r() - 0.5) * 50
      const dist = Math.hypot(x, y)
      const p = 0.95 - dist / 110 + n * 0.03
      attempts.push({ x: Math.round(x), y: Math.round(y), scored: r() < p, kind: y > 60 ? 'long' : 'free' })
    }
    return { id: uid(), date: addDays(t, -ago), attempts }
  })

  const start = addDays(mondayOf(t), -14)
  d.goals = [{ id: 'sample-goal', type: 'speed', startDate: start, weeks: 8, extraSessions: 3, equipment: 'gym', phase: 'pre', active: true, createdAt: start }]
  d.benchmarks = [
    { id: uid(), date: start, test: 'sprint10', value: 1.86 },
    { id: uid(), date: start, test: 'sprint20', value: 3.21 },
    { id: uid(), date: start, test: 'flying20', value: 2.48 },
  ]
  // week plans with everything that was logged ticked in
  const acts = { gym: 'gym', speed: 'speed', skills: 'skills', conditioning: 'conditioning', recovery: 'recovery', pitch: 'pitch', match: 'match' } as const
  d.weekPlans = [0, 1, 2, 3, 4, 5].map(w => {
    const mon = addDays(mondayOf(t), -7 * w)
    const days = suggestedWeekDays(d.goals, d.profile, mon)
    for (const s of sessions) {
      const k = Math.round((new Date(s.date).getTime() - new Date(mon).getTime()) / 86400000)
      if (k >= 0 && k < 7) {
        const list = days[k].filter(a => a !== 'rest')
        if (!list.includes(acts[s.category])) list.push(acts[s.category])
        days[k] = list
      }
    }
    return { id: mon, weekStart: mon, days }
  })
  return d
}

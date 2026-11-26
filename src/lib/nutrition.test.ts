// Unit tests for nutrition.ts. Run with: npx tsx src/lib/nutrition.test.ts
import { bmr, kcalFloor, dailyTargets, redsWarning } from './nutrition'
import type { Profile } from './types'

let pass = 0
let fail = 0

function assert(label: string, condition: boolean) {
  if (condition) { pass++; console.log(`  ✓ ${label}`) }
  else { fail++; console.error(`  ✗ ${label}`) }
}

function approx(a: number, b: number, tol = 10): boolean {
  return Math.abs(a - b) <= tol
}

// ---- BMR ----
// 10×weight + 6.25×height − 5×age ± sex constant
// male 80kg 180cm 22y: 800 + 1125 − 110 + 5 = 1820
// female 60kg 165cm 25y: 600 + 1031.25 − 125 − 161 = 1345
console.log('\nBMR (Mifflin–St Jeor)')
assert('male 80kg 180cm 22y = 1820', approx(bmr(80, 180, 22, 'male'), 1820))
assert('female 60kg 165cm 25y = 1345', approx(bmr(60, 165, 25, 'female'), 1345))
assert('unspecified is average of male/female', bmr(80, 180, 22, 'unspecified') === Math.round((bmr(80, 180, 22, 'male') + bmr(80, 180, 22, 'female')) / 2))

// ---- Calorie floor ----
console.log('\nCalorie floor')
const bmrVal = bmr(80, 180, 22, 'male')
assert('floor >= 1800 for males', kcalFloor(bmrVal, 'male') >= 1800)
assert('floor >= 1500 for females', kcalFloor(bmr(50, 160, 25, 'female'), 'female') >= 1500)
assert('floor = max(bmr*1.2, sexMin)', kcalFloor(1200, 'male') === 1800)

const baseProfile: Profile = {
  name: 'Test', age: 22, sex: 'male', heightCm: 180, weightKg: 80,
  sport: 'hurling', sports: ['hurling'], position: 'halfforward', level: 'senior',
  trainingAge: 'intermediate', recentInjuries: [], county: 'default',
  clubTrainingDays: [1, 3], matchDay: 6,
  teams: [{ sport: 'hurling', trainingDays: [1, 3], matchDay: 6 }],
  phase: 'in', plan: 'free', onboarded: true,
}

// ---- Maintain ----
console.log('\nMaintain direction')
const mt = dailyTargets(baseProfile, [], [], 'maintain')
assert('maintain = maintenance kcal', mt.kcal === mt.kcalMaintenance)
assert('maintain no note', !mt.note)
assert('protein in range', mt.protein.g >= 128 && mt.protein.g <= 176)

// ---- Lose ----
// For 80kg/180cm/22y male, bmr=1820, floor=max(1820*1.2,1800)=2184, maintenance≈2548
// 2548-400=2148, but 2184>2148 so floor applies
console.log('\nLose direction (normal day)')
const lt = dailyTargets(baseProfile, [], [], 'lose')
assert('lose = max(maintenance-400, floor)', lt.kcal === Math.max(lt.kcalMaintenance - 400, lt.kcalFloor))
assert('lose >= floor', lt.kcal >= lt.kcalFloor)

console.log('\nLose direction (match day)')
const lm = dailyTargets(baseProfile, ['match'], [], 'lose')
assert('match day: no deficit', lm.kcal === lm.kcalMaintenance)
assert('match day note present', !!lm.note && lm.note.includes('Match day'))

console.log('\nLose direction (day before match)')
const lp = dailyTargets(baseProfile, [], ['match'], 'lose')
assert('day before match: no deficit', lp.kcal === lp.kcalMaintenance)
assert('day before match note present', !!lp.note && lp.note.includes('Day before'))

// ---- Gain ----
console.log('\nGain direction')
const gt = dailyTargets(baseProfile, [], [], 'gain')
assert('gain = maintenance + 300', gt.kcal === gt.kcalMaintenance + 300)

// ---- Calorie floor safety ----
console.log('\nCalorie floor safety')
const youngLight: Profile = { ...baseProfile, weightKg: 45, heightCm: 165, age: 15 }
const yt = dailyTargets(youngLight, [], [], 'lose')
assert('floor prevents going below minimum', yt.kcal >= yt.kcalFloor)

// ---- Under-18 note ----
// (Handled in UI; nutrition.ts itself still returns targets — the UI blocks 'lose' for under-18s)

// ---- Missing profile ----
console.log('\nMissing profile data')
const noWeight: Profile = { ...baseProfile, weightKg: null }
const nwt = dailyTargets(noWeight, [], [], 'maintain')
assert('missing data returns fallback', !!nwt.missingProfile)

// ---- RED-S warning ----
console.log('\nRED-S warning')
const today = '2026-11-26'
const logs7Days = Array.from({ length: 5 }, (_, i) => ({ id: `2026-11-${(21 + i).toString().padStart(2, '0')}`, date: `2026-11-${(21 + i).toString().padStart(2, '0')}`, kcal: 1200, protein: 100, source: 'manual' as const }))
const warn = redsWarning([], logs7Days, { ...mt, kcal: 2200 }, today)
assert('RED-S warning fires when intake too low', warn !== null)

const okLogs = logs7Days.map(l => ({ ...l, kcal: 2100 }))
const noWarn = redsWarning([], okLogs, { ...mt, kcal: 2200 }, today)
assert('no RED-S warning when intake adequate', noWarn === null)

// ---- Summary ----
console.log(`\n${pass + fail} tests: ${pass} passed, ${fail} failed`)
if (fail > 0) throw new Error(`${fail} test(s) failed`)

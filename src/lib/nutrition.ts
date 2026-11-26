// Nutrition targets and body composition calculations for GAA players.
//
// All maths is in this file so it can be unit-tested independently.
// Run tests: npx tsx src/lib/nutrition.test.ts

import type { BodyDirection, DayActivity, NutritionLog, Profile, WeightLog } from './types'

// ---- BMR (Mifflin–St Jeor) ----

export function bmr(weightKg: number, heightCm: number, age: number, sex: 'male' | 'female' | 'unspecified'): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age
  if (sex === 'male') return Math.round(base + 5)
  if (sex === 'female') return Math.round(base - 161)
  return Math.round(base - 78) // average of male (+5) and female (−161) constant
}

/** Minimum safe daily calories. */
export function kcalFloor(bmrVal: number, sex: 'male' | 'female' | 'unspecified'): number {
  const sexMin = sex === 'male' ? 1800 : sex === 'female' ? 1500 : 1650
  return Math.max(Math.round(bmrVal * 1.2), sexMin)
}

// ---- Training energy contribution ----

const ACTIVITY_KCAL: Partial<Record<DayActivity, number>> = {
  match: 500,
  pitch: 400,
  gym: 300,
  speed: 300,
  conditioning: 300,
  skills: 150,
  recovery: 100,
}

function trainingKcal(activities: DayActivity[]): number {
  return activities.reduce((t, a) => t + (ACTIVITY_KCAL[a] ?? 0), 0)
}

function isHeavyDay(activities: DayActivity[]): boolean {
  return activities.some(a => a === 'match' || a === 'pitch' || a === 'gym' || a === 'speed' || a === 'conditioning')
}

// ---- Daily targets ----

export interface DailyTargets {
  kcal: number
  kcalMaintenance: number
  kcalFloor: number
  protein: { g: number; min: number; max: number }
  carbs: { g: number; min: number; max: number }
  fat: { g: number; min: number }
  note?: string
  missingProfile?: true
}

export function dailyTargets(
  profile: Profile,
  todayActivities: DayActivity[],
  tomorrowActivities: DayActivity[],
  direction: BodyDirection,
): DailyTargets {
  const { weightKg, heightCm, age, sex } = profile
  const safeSex = sex ?? 'unspecified'

  if (!weightKg || !heightCm || !age) {
    return {
      kcal: 2200, kcalMaintenance: 2200, kcalFloor: 1650,
      protein: { g: 140, min: 100, max: 180 },
      carbs: { g: 300, min: 200, max: 400 },
      fat: { g: 70, min: 60 },
      note: 'Add your weight, height and age in your profile to get personalised targets.',
      missingProfile: true,
    }
  }

  const bmrVal = bmr(weightKg, heightCm, age, safeSex)
  const floor = kcalFloor(bmrVal, safeSex)
  const maintenance = Math.round(bmrVal * 1.4 + trainingKcal(todayActivities))

  const isMatchDay = todayActivities.includes('match')
  const isDayBeforeMatch = tomorrowActivities.includes('match')
  const noDeficitToday = isMatchDay || isDayBeforeMatch

  let note: string | undefined
  let kcal = maintenance

  if (direction === 'lose') {
    if (noDeficitToday) {
      kcal = maintenance
      note = isMatchDay
        ? 'Match day: fuelling at maintenance to support your performance.'
        : 'Day before a match: eating at maintenance to prepare.'
    } else {
      kcal = maintenance - 400 // 400 kcal deficit (middle of 300–500 range)
    }
  } else if (direction === 'gain') {
    kcal = maintenance + 300 // 300 kcal surplus (middle of 250–350 range)
  }

  if (kcal < floor) {
    kcal = floor
    if (direction === 'lose' && !noDeficitToday) {
      note = 'Minimum safe intake reached. No further deficit applied.'
    }
  }

  const heavy = isHeavyDay(todayActivities)
  const wt = weightKg

  const proteinG = Math.round(wt * 1.8)
  const proteinMin = Math.round(wt * 1.6)
  const proteinMax = Math.round(wt * 2.2)

  const carbsMin = heavy ? Math.round(wt * 6) : Math.round(wt * 3)
  const carbsMax = heavy ? Math.round(wt * 8) : Math.round(wt * 5)
  const carbsG = Math.round((carbsMin + carbsMax) / 2)

  const fatMin = Math.round(wt * 0.8)
  const remainKcal = Math.max(kcal - proteinG * 4 - carbsG * 4, fatMin * 9)
  const fatG = Math.max(Math.round(remainKcal / 9), fatMin)

  return { kcal, kcalMaintenance: maintenance, kcalFloor: floor, protein: { g: proteinG, min: proteinMin, max: proteinMax }, carbs: { g: carbsG, min: carbsMin, max: carbsMax }, fat: { g: fatG, min: fatMin }, note }
}

// ---- RED-S warning ----

/** Check for under-fuelling signals. Returns a warning string or null. */
export function redsWarning(
  weightLogs: WeightLog[],
  nutritionLogs: NutritionLog[],
  targets: DailyTargets,
  todayISO: string,
): string | null {
  const toDate = (s: string) => new Date(s).getTime()
  const todayMs = toDate(todayISO)
  const msPerDay = 86400000

  // Check: intake under target by >500 kcal on 4+ of the last 7 days
  if (!targets.missingProfile) {
    const last7 = nutritionLogs.filter(n => {
      const diff = (todayMs - toDate(n.date)) / msPerDay
      return diff >= 0 && diff < 7
    })
    const underFuelDays = last7.filter(n => targets.kcal - n.kcal > 500).length
    if (underFuelDays >= 4) {
      return 'Your logged calories have been more than 500 kcal below target on several days this week. Under-fuelling raises injury risk and can slow recovery. Consider reviewing your targets or speaking to a sports dietitian.'
    }
  }

  // Check: weight dropping faster than 1% per week for 2 consecutive weeks
  const sorted = [...weightLogs].sort((a, b) => a.date.localeCompare(b.date))
  if (sorted.length >= 3) {
    const recent = sorted[sorted.length - 1]
    const twoWeeksAgo = sorted.find(w => {
      const diff = (toDate(recent.date) - toDate(w.date)) / msPerDay
      return diff >= 10 && diff <= 18
    })
    const fourWeeksAgo = sorted.find(w => {
      const diff = (toDate(recent.date) - toDate(w.date)) / msPerDay
      return diff >= 24 && diff <= 32
    })
    if (twoWeeksAgo && fourWeeksAgo) {
      const rateRecent = (twoWeeksAgo.kg - recent.kg) / twoWeeksAgo.kg
      const rateEarlier = (fourWeeksAgo.kg - twoWeeksAgo.kg) / fourWeeksAgo.kg
      if (rateRecent > 0.01 && rateEarlier > 0.01) {
        return 'Your weight has dropped more than 1% per week for two weeks running. Losing weight this quickly can harm performance and increase injury risk. Consider speaking to a GP or sports dietitian.'
      }
    }
  }

  return null
}

// ---- Validation ----

export function validateMfpUrl(url: string): boolean {
  try {
    const u = new URL(url)
    return u.hostname === 'www.myfitnesspal.com' || u.hostname === 'myfitnesspal.com'
  } catch {
    return false
  }
}

// ---- CSV import ----

export interface CsvRow {
  date: string
  kcal: number
  protein: number
  carbs?: number
  fat?: number
}

export interface CsvParseResult {
  rows: CsvRow[]
  errors: string[]
}

/** Parse a MyFitnessPal "Nutrition Summary" CSV export (browser-side, no network). */
export function parseMfpCsv(text: string): CsvParseResult {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return { rows: [], errors: ['File appears to be empty.'] }

  const header = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase())

  // Flexible column matching
  function col(patterns: string[]): number {
    for (const p of patterns) {
      const i = header.findIndex(h => h.includes(p))
      if (i >= 0) return i
    }
    return -1
  }

  const dateIdx = col(['date'])
  const kcalIdx = col(['calorie', 'energy', 'kcal'])
  const protIdx = col(['protein'])
  const carbIdx = col(['carbohydrat', 'carb'])
  const fatIdx = col(['fat'])

  const errors: string[] = []
  if (dateIdx < 0) errors.push('Could not find a "Date" column.')
  if (kcalIdx < 0) errors.push('Could not find a "Calories" column.')
  if (protIdx < 0) errors.push('Could not find a "Protein" column.')
  if (errors.length) return { rows: [], errors }

  const rows: CsvRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''))
    if (cells.length <= 1 || !cells[dateIdx]) continue

    const dateRaw = cells[dateIdx]
    // Accept YYYY-MM-DD or MM/DD/YYYY or DD/MM/YYYY
    let date = dateRaw
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateRaw)) {
      const [a, b, y] = dateRaw.split('/')
      // Assume MM/DD/YYYY (MFP default)
      date = `${y}-${a.padStart(2, '0')}-${b.padStart(2, '0')}`
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue

    const kcal = parseFloat(cells[kcalIdx] ?? '')
    const protein = parseFloat(cells[protIdx] ?? '')
    if (isNaN(kcal) || isNaN(protein)) continue

    const carbs = carbIdx >= 0 ? parseFloat(cells[carbIdx] ?? '') : undefined
    const fat = fatIdx >= 0 ? parseFloat(cells[fatIdx] ?? '') : undefined

    rows.push({ date, kcal: Math.round(kcal), protein: Math.round(protein), carbs: carbs !== undefined && !isNaN(carbs) ? Math.round(carbs) : undefined, fat: fat !== undefined && !isNaN(fat) ? Math.round(fat) : undefined })
  }

  if (rows.length === 0) errors.push('No valid rows found in the file.')
  return { rows, errors }
}

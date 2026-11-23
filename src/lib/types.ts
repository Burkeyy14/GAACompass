// Core data types for GAA Compass

export type Sport = 'football' | 'hurling' | 'camogie' | 'lgfa'
export type Level = 'underage' | 'junior' | 'intermediate' | 'senior' | 'intercounty'
export type Phase = 'off' | 'pre' | 'in'
export type Equipment = 'gym' | 'minimal'
export type Position = 'goalkeeper' | 'fullback' | 'halfback' | 'midfield' | 'halfforward' | 'fullforward' | 'unknown'
export type TrainingAge = 'beginner' | 'intermediate' | 'advanced'
export type Sex = 'male' | 'female' | 'unspecified'
export type InjuryArea = 'hamstring' | 'groin' | 'calf' | 'ankle' | 'knee' | 'back' | 'shoulder'

export interface Profile {
  name: string
  age: number | null
  sex: Sex
  heightCm: number | null
  weightKg: number | null
  sport: Sport
  position: Position
  level: Level
  /** gym experience */
  trainingAge: TrainingAge
  /** injuries in the last 12 months */
  recentInjuries: InjuryArea[]
  county: string // county key, or 'default'
  /** 0 = Monday ... 6 = Sunday */
  clubTrainingDays: number[]
  /** usual match day, null if none */
  matchDay: number | null
  phase: Phase
  plan: 'free' | 'pro'
  onboarded: boolean
}

export type TightnessLevel = 'none' | 'mild' | 'sharp'
export type BodyArea = 'hamstring' | 'groin' | 'calf' | 'quad' | 'hip' | 'back' | 'knee' | 'ankle' | 'shoulder' | 'other'

export interface CheckIn {
  id: string // = date
  date: string // YYYY-MM-DD
  sleep: number // 1-10, higher better
  energy: number // 1-10, higher better
  soreness: number // 1-10, higher worse
  stress: number // 1-10, higher worse
  rpe: number // yesterday's session RPE 1-10 (0 if rest)
  tightness: TightnessLevel
  areas: BodyArea[]
  notes?: string
}

export type DayActivity = 'rest' | 'recovery' | 'skills' | 'gym' | 'speed' | 'conditioning' | 'pitch' | 'match'

export interface WeekPlan {
  id: string // = weekStart YYYY-MM-DD (Monday)
  weekStart: string
  days: DayActivity[][] // 7 entries, each a list of activities
}

export type SessionCategory = 'gym' | 'speed' | 'skills' | 'conditioning' | 'recovery' | 'pitch' | 'match'

export interface SetLog {
  itemId: string
  name: string
  set: number
  reps?: number
  kg?: number
  seconds?: number
}

export interface SessionLog {
  id: string
  date: string
  category: SessionCategory
  title: string
  minutes: number
  rpe: number // 1-10
  notes?: string
  /** individual sets, when done through the workout player */
  sets?: SetLog[]
  /** goalId:week:sessionKey if from a generated plan */
  programRef?: string
}

export type FreeKind = 'free' | 'long' | 'sideline' | 'penalty' | 'play'

export interface FreeAttempt {
  x: number // metres from centre of goal, left negative
  y: number // metres out from the end line
  scored: boolean
  kind: FreeKind
}

export interface FreeSession {
  id: string
  date: string
  attempts: FreeAttempt[]
  notes?: string
}

export type GoalType = 'speed' | 'power' | 'strength' | 'engine' | 'agility' | 'hamstring' | 'frees' | 'skills'

export interface Goal {
  id: string
  type: GoalType
  startDate: string // Monday of week 1
  weeks: number
  extraSessions: number // sessions per week on top of club training
  equipment: Equipment
  phase: Phase
  active: boolean
  createdAt: string
}

export type BenchmarkTest =
  | 'sprint10'
  | 'sprint20'
  | 'sprint40'
  | 'flying20'
  | 'broadJump'
  | 'agility505'
  | 'bronco'
  | 'squat3rm'
  | 'freesPct'

export interface Benchmark {
  id: string
  date: string
  test: BenchmarkTest
  value: number
}

export interface AppData {
  profile: Profile
  checkins: CheckIn[]
  weekPlans: WeekPlan[]
  sessions: SessionLog[]
  frees: FreeSession[]
  goals: Goal[]
  benchmarks: Benchmark[]
}

export type CollectionKey = Exclude<keyof AppData, 'profile'>

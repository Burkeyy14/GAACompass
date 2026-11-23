import type { AppData, Profile } from './types'

export const DEFAULT_PROFILE: Profile = {
  name: '',
  age: null,
  sex: 'unspecified',
  heightCm: null,
  weightKg: null,
  sport: 'hurling',
  position: 'unknown',
  level: 'senior',
  trainingAge: 'intermediate',
  recentInjuries: [],
  county: 'default',
  clubTrainingDays: [1, 3],
  matchDay: 6,
  phase: 'in',
  plan: 'free',
  onboarded: false,
}

export function emptyData(): AppData {
  return { profile: { ...DEFAULT_PROFILE }, checkins: [], weekPlans: [], sessions: [], frees: [], goals: [], benchmarks: [] }
}


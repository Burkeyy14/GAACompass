import type { AppData, Profile, TeamSchedule } from './types'

export const DEFAULT_PROFILE: Profile = {
  name: '',
  age: null,
  sex: 'unspecified',
  heightCm: null,
  weightKg: null,
  sport: 'hurling',
  sports: ['hurling'],
  position: 'unknown',
  level: 'senior',
  trainingAge: 'intermediate',
  recentInjuries: [],
  county: 'default',
  clubTrainingDays: [1, 3],
  matchDay: 6,
  teams: [{ sport: 'hurling', trainingDays: [1, 3], matchDay: 6 }],
  phase: 'in',
  plan: 'free',
  onboarded: false,
}

/**
 * Migrate a raw profile from storage (which may be old-format without `sports`/`teams`)
 * into the current shape. Called on every profile load so the rest of the app can rely on
 * `sports` and `teams` always being present.
 */
export function normalizeProfile(raw: Partial<Profile> & Record<string, unknown>): Profile {
  const p = { ...DEFAULT_PROFILE, ...raw } as Profile

  // Migrate legacy `sport` → `sports`
  if (!Array.isArray((raw as Partial<Profile>).sports) || p.sports.length === 0) {
    const legacySport = (raw.sport as string | undefined) ?? DEFAULT_PROFILE.sport
    p.sports = [legacySport as Profile['sport']]
  }

  // Migrate legacy `clubTrainingDays` / `matchDay` → `teams`
  if (!Array.isArray((raw as Partial<Profile>).teams) || p.teams.length === 0) {
    const legacyDays: number[] = Array.isArray(raw.clubTrainingDays)
      ? (raw.clubTrainingDays as number[])
      : DEFAULT_PROFILE.clubTrainingDays
    const legacyMatchDay: number | null =
      raw.matchDay !== undefined ? (raw.matchDay as number | null) : DEFAULT_PROFILE.matchDay
    p.teams = p.sports.map((s, i): TeamSchedule => ({
      sport: s,
      trainingDays: i === 0 ? legacyDays : [],
      matchDay: i === 0 ? legacyMatchDay : null,
    }))
  }

  // Keep backward-compat single-code fields in sync with the primary team
  p.sport = p.sports[0]
  p.clubTrainingDays = p.teams[0]?.trainingDays ?? DEFAULT_PROFILE.clubTrainingDays
  p.matchDay = p.teams[0]?.matchDay ?? null

  return p
}

export function emptyData(): AppData {
  return { profile: { ...DEFAULT_PROFILE }, checkins: [], weekPlans: [], sessions: [], frees: [], goals: [], benchmarks: [] }
}


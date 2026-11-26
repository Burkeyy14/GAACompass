import { useState } from 'react'
import type { InjuryArea, Level, Phase, Position, Profile, Sex, Sport, TeamSchedule, TrainingAge } from '../lib/types'
import { COUNTIES } from '../lib/counties'
import { DAY_SHORT } from '../lib/dates'
import { POSITION_LABEL } from '../lib/programs'
import { Chips } from '../components/ui'
import { Icon } from '../components/Icon'

const SPORT_LABEL: Record<Sport, string> = { hurling: 'Hurling', football: 'Football', camogie: 'Camogie', lgfa: 'Ladies football' }

export const SPORTS: { value: Sport; label: string }[] = [
  { value: 'hurling', label: 'Hurling' },
  { value: 'football', label: 'Football' },
  { value: 'camogie', label: 'Camogie' },
  { value: 'lgfa', label: 'Ladies football' },
]
const LEVELS: { value: Level; label: string }[] = [
  { value: 'underage', label: 'Minor' },
  { value: 'junior', label: 'Junior' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'senior', label: 'Senior club' },
  { value: 'intercounty', label: 'Inter-county' },
]
export const PHASES: { value: Phase; label: string }[] = [
  { value: 'off', label: 'Off-season' },
  { value: 'pre', label: 'Pre-season' },
  { value: 'in', label: 'In-season' },
]
const POSITIONS: Position[] = ['goalkeeper', 'fullback', 'halfback', 'midfield', 'halfforward', 'fullforward']
const EXPERIENCE: { value: TrainingAge; label: string }[] = [
  { value: 'beginner', label: 'New to the gym' },
  { value: 'intermediate', label: '1–3 years' },
  { value: 'advanced', label: '3+ years' },
]
const INJURIES: { value: InjuryArea; label: string }[] = [
  { value: 'hamstring', label: 'Hamstring' },
  { value: 'groin', label: 'Groin' },
  { value: 'calf', label: 'Calf / Achilles' },
  { value: 'ankle', label: 'Ankle' },
  { value: 'knee', label: 'Knee' },
  { value: 'back', label: 'Back' },
  { value: 'shoulder', label: 'Shoulder' },
]

type Set = (p: Partial<Profile>) => void

function numOrNull(v: string): number | null {
  const n = Number(v)
  return v === '' || Number.isNaN(n) ? null : n
}

function AboutYou({ p, set }: { p: Profile; set: Set }) {
  return (
    <div className="card stack">
      <label className="field">
        First name
        <input type="text" value={p.name} onChange={e => set({ name: e.target.value })} placeholder="e.g. Kevin" />
      </label>
      <div className="grid2">
        <label className="field">
          Age
          <div className="unit-input"><input type="number" inputMode="numeric" min={12} max={60} value={p.age ?? ''} onChange={e => set({ age: numOrNull(e.target.value) })} /><span>yrs</span></div>
        </label>
        <div className="field">
          Sex
          <select value={p.sex} onChange={e => set({ sex: e.target.value as Sex })}>
            <option value="unspecified">Prefer not to say</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>
        <label className="field">
          Height
          <div className="unit-input"><input type="number" inputMode="numeric" min={120} max={230} value={p.heightCm ?? ''} onChange={e => set({ heightCm: numOrNull(e.target.value) })} /><span>cm</span></div>
        </label>
        <label className="field">
          Weight
          <div className="unit-input"><input type="number" inputMode="decimal" min={35} max={160} value={p.weightKg ?? ''} onChange={e => set({ weightKg: numOrNull(e.target.value) })} /><span>kg</span></div>
        </label>
      </div>
      <div className="tiny muted">Your weight sets your starting gym weights. Your age changes how much training volume we prescribe.</div>
    </div>
  )
}

function YourGame({ p, set }: { p: Profile; set: Set }) {
  const sports = p.sex === 'male'
    ? SPORTS.filter(s => s.value === 'hurling' || s.value === 'football')
    : p.sex === 'female'
    ? SPORTS.filter(s => s.value === 'camogie' || s.value === 'lgfa')
    : SPORTS

  function toggleSport(sportVal: Sport) {
    const isOn = p.sports.includes(sportVal)
    let newSports: Sport[]
    if (isOn) {
      if (p.sports.length === 1) return
      newSports = p.sports.filter(s => s !== sportVal)
    } else {
      if (p.sports.length >= 2) return
      newSports = [...p.sports, sportVal]
    }
    const newTeams: TeamSchedule[] = newSports.map(s => p.teams.find(t => t.sport === s) ?? { sport: s, trainingDays: [], matchDay: null })
    set({ sports: newSports, teams: newTeams, sport: newSports[0], clubTrainingDays: newTeams[0].trainingDays, matchDay: newTeams[0].matchDay })
  }

  return (
    <div className="card stack">
      <div className="field">
        What do you play?
        <Chips options={sports} value={p.sports} onChange={toggleSport} />
        {p.sports.length < 2 && <span className="tiny muted">Dual player? Pick both.</span>}
      </div>
      <div className="field">Position<Chips options={POSITIONS.map(v => ({ value: v, label: POSITION_LABEL[v] }))} value={p.position} onChange={v => set({ position: v })} /></div>
      <div className="field">Playing level<Chips options={LEVELS} value={p.level} onChange={v => set({ level: v })} /></div>
      <div className="field">Gym experience<Chips options={EXPERIENCE} value={p.trainingAge} onChange={v => set({ trainingAge: v })} /></div>
      <div className="field">
        Injuries in the last 12 months
        <Chips
          options={INJURIES}
          value={p.recentInjuries}
          onChange={v => set({ recentInjuries: p.recentInjuries.includes(v) ? p.recentInjuries.filter(x => x !== v) : [...p.recentInjuries, v] })}
        />
        <span className="tiny" style={{ fontWeight: 500 }}>A previous injury is the biggest risk factor for another one, so we add extra protection for it.</span>
      </div>
      <label className="field">
        County colours
        <select value={p.county} onChange={e => set({ county: e.target.value })}>
          {Object.entries(COUNTIES).map(([k, c]) => (
            <option key={k} value={k}>{k === 'default' ? 'Default' : c.name}</option>
          ))}
        </select>
      </label>
    </div>
  )
}

function YourWeek({ p, set }: { p: Profile; set: Set }) {
  function setTeam(sportVal: Sport, patch: Partial<TeamSchedule>) {
    const teams = p.teams.map(t => t.sport === sportVal ? { ...t, ...patch } : t)
    set({ teams, sport: teams[0].sport, clubTrainingDays: teams[0].trainingDays, matchDay: teams[0].matchDay })
  }

  return (
    <div className="card stack">
      <div className="small muted">Your sessions get planned around these days, so you're fresh for matches.</div>
      {p.teams.map(team => (
        <div key={team.sport} className="stack sm">
          {p.sports.length > 1 && (
            <div className="tiny" style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--accent)' }}>
              {SPORT_LABEL[team.sport]}
            </div>
          )}
          <div className="field">
            Training nights
            <Chips
              options={DAY_SHORT.map((d, i) => ({ value: i, label: d }))}
              value={team.trainingDays}
              onChange={d => setTeam(team.sport, { trainingDays: team.trainingDays.includes(d) ? team.trainingDays.filter(x => x !== d) : [...team.trainingDays, d].sort() })}
            />
          </div>
          <div className="field">
            Usual match day
            <Chips
              options={[{ value: -1, label: 'None' }, ...DAY_SHORT.map((d, i) => ({ value: i, label: d }))]}
              value={team.matchDay ?? -1}
              onChange={d => setTeam(team.sport, { matchDay: d === -1 ? null : d, trainingDays: team.trainingDays.filter(x => x !== d) })}
            />
          </div>
        </div>
      ))}
      <div className="field">Season phase<Chips options={PHASES} value={p.phase} onChange={v => set({ phase: v })} /></div>
    </div>
  )
}

/** Full profile editor (settings). */
export function ProfileForm({ initial, onSave, cta }: { initial: Profile; onSave: (p: Profile) => void; cta: string }) {
  const [p, setP] = useState<Profile>(initial)
  const set: Set = patch => setP(x => ({ ...x, ...patch }))
  return (
    <div className="stack">
      <div className="section-label">About you</div>
      <AboutYou p={p} set={set} />
      <div className="section-label">Your game</div>
      <YourGame p={p} set={set} />
      <div className="section-label">Your week</div>
      <YourWeek p={p} set={set} />
      <button className="btn block lg" onClick={() => onSave({ ...p, onboarded: true })}>{cta}</button>
    </div>
  )
}

/** Three-step first-run setup. */
export function Onboarding({ initial, onSave }: { initial: Profile; onSave: (p: Profile) => void }) {
  const [p, setP] = useState<Profile>(initial)
  const [step, setStep] = useState(0)
  const set: Set = patch => setP(x => ({ ...x, ...patch }))
  const titles = ['About you', 'Your game', 'Your week']
  const subs = [
    'Used to tailor your plans: volume, starting weights and recovery.',
    'Your position and injury history shape what we prescribe.',
    'Your sessions get planned around your club training and matches.',
  ]
  return (
    <div className="stack">
      <div className="steps">{titles.map((_, i) => <span key={i} className={i <= step ? 'on' : ''} />)}</div>
      <div className="large-title">
        <div className="eyebrow">Step {step + 1} of 3</div>
        <h1>{titles[step]}</h1>
        <div className="small muted" style={{ marginTop: 6 }}>{subs[step]}</div>
      </div>
      {step === 0 && <AboutYou p={p} set={set} />}
      {step === 1 && <YourGame p={p} set={set} />}
      {step === 2 && <YourWeek p={p} set={set} />}
      <div className="row">
        {step > 0 && <button className="btn plain lg" onClick={() => setStep(step - 1)}><Icon name="left" size={18} /></button>}
        <button className="btn lg grow" onClick={() => (step < 2 ? setStep(step + 1) : onSave({ ...p, onboarded: true }))}>
          {step < 2 ? 'Continue' : "Let's go"}
        </button>
      </div>
    </div>
  )
}

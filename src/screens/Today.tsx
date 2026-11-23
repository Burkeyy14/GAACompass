import type { Nav } from '../App'
import { useStore } from '../lib/store'
import { mondayOf, prettyDate, today, weekday } from '../lib/dates'
import { readiness } from '../lib/recovery'
import { ACTIVITY_META, loadStatus } from '../lib/load'
import { currentWeekIndex, sessionsForDate } from '../lib/generator'
import { GOALS } from '../lib/programs'
import { Ring, LEVEL_COLOR, Banner } from '../components/ui'
import { CatBadge, Icon, GOAL_ICON, GOAL_TINT } from '../components/Icon'
import { PlannedCard } from '../components/PlannedCard'
import { InstallPrompt } from '../components/InstallPrompt'
import { CATEGORY_ACTIVITY } from '../lib/generator'

export function Today({ nav }: { nav: Nav }) {
  const { data } = useStore()
  const t = today()
  const checkin = data.checkins.find(c => c.date === t) ?? null
  const r = checkin ? readiness(checkin, data.checkins) : null
  const load = loadStatus(data.sessions, t)
  const items = sessionsForDate(data.goals, data.profile, t)
  const plan = data.weekPlans.find(w => w.weekStart === mondayOf(t))
  const covered = new Set(items.map(i => CATEGORY_ACTIVITY[i.session.category]))
  const planned = (plan?.days[weekday(t)] ?? []).filter(a => a !== 'rest' && !covered.has(a))
  const loggedToday = data.sessions.filter(s => s.date === t)
  const doneActs = new Set(loggedToday.map(s => CATEGORY_ACTIVITY[s.category]))
  const activeGoals = data.goals.filter(g => g.active)
  const hour = new Date().getHours()
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <>
      <div className="large-title">
        <div className="eyebrow">{prettyDate(t)}</div>
        <h1>{greet}{data.profile.name ? `, ${data.profile.name}` : ''}</h1>
      </div>

      {r && checkin ? (
        <button className="card" onClick={() => nav.open({ kind: 'checkin' })}>
          <div className="row" style={{ gap: 16 }}>
            <Ring value={r.score} size={92} color={LEVEL_COLOR[r.level]} label="/ 10" />
            <div className="grow">
              <div className="tiny muted" style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>Readiness</div>
              <div style={{ fontWeight: 750, fontSize: 19, letterSpacing: -0.3, marginTop: 2 }}>{r.headline}</div>
              <div className="small muted" style={{ marginTop: 3 }}>{r.advice}</div>
            </div>
          </div>
          {r.reasons.length > 0 && (
            <div className="chips" style={{ marginTop: 12 }}>
              {r.reasons.map(x => <span key={x} className="pill grey">{x}</span>)}
            </div>
          )}
        </button>
      ) : (
        <div className="card">
          <div className="row top" style={{ gap: 14 }}>
            <div className="cat-badge" style={{ width: 48, height: 48, background: 'linear-gradient(145deg, var(--accent), color-mix(in srgb, var(--accent) 60%, #000))' }}>
              <Icon name="pulse" size={26} stroke={2.1} />
            </div>
            <div className="grow">
              <div style={{ fontWeight: 750, fontSize: 18, letterSpacing: -0.3 }}>How are you today?</div>
              <div className="small muted" style={{ marginTop: 3 }}>A 30-second check-in. It adjusts today's training to how your body is doing.</div>
            </div>
          </div>
          <button className="btn block" style={{ marginTop: 14 }} onClick={() => nav.open({ kind: 'checkin' })}>Check in</button>
        </div>
      )}

      {(load.level === 'spike' || load.level === 'caution') && (
        <Banner kind={load.level === 'spike' ? 'red' : 'amber'}>
          <b>{load.level === 'spike' ? 'Load spike.' : 'Load climbing.'}</b> {load.message}
        </Banner>
      )}

      <div className="section-label">Today's training</div>
      {items.map(item => <PlannedCard key={item.ref} item={item} nav={nav} />)}
      {planned.length > 0 && (
        <div className="card tight">
          <div className="row wrap" style={{ gap: 8 }}>
            {planned.map(a => (
              <span key={a} className={'act' + (doneActs.has(a) ? ' done' : '')}>
                <CatBadge cat={a} size={22} />
                {ACTIVITY_META[a].label}
                {doneActs.has(a) && <Icon name="check" size={14} stroke={3} className="tick" />}
              </span>
            ))}
          </div>
        </div>
      )}
      {items.length === 0 && planned.length === 0 && (
        <div className="card tight small muted">
          {activeGoals.length === 0 ? (
            <>Nothing planned. <button className="link" onClick={() => nav.go('goals')}>Set a goal</button> and we'll build your sessions.</>
          ) : (
            'Rest day: nothing planned today.'
          )}
        </div>
      )}

      <div className="grid2">
        <button className="card tight" onClick={() => nav.open({ kind: 'log' })}>
          <div className="row"><CatBadge cat="pitch" size={34} /><span className="grow" /></div>
          <div style={{ fontWeight: 700, marginTop: 10 }}>Log training</div>
          <div className="tiny muted">{loggedToday.length ? `${loggedToday.length} logged today` : 'Club session or match'}</div>
        </button>
        <button className="card tight" onClick={() => nav.go('train')}>
          <div className="row"><CatBadge cat="skills" size={34} /><span className="grow" /></div>
          <div style={{ fontWeight: 700, marginTop: 10 }}>Free-taking</div>
          <div className="tiny muted">Tap the pitch to log</div>
        </button>
      </div>

      <div className="card tight">
        <div className="row between">
          <div className="row"><Icon name="trend" size={20} /><b>Training load</b></div>
          <span className={`pill ${{ building: 'grey', low: 'grey', good: 'green', caution: 'amber', spike: 'red' }[load.level]}`}>
            {load.ratio === null ? 'Building baseline' : `${load.ratio}× usual`}
          </span>
        </div>
        <div className="small muted" style={{ marginTop: 6 }}>
          Last 7 days <b className="num" style={{ color: 'var(--ink)' }}>{load.acute}</b>
          {load.chronicWeekly ? <> · 4-week average <b className="num" style={{ color: 'var(--ink)' }}>{Math.round(load.chronicWeekly)}</b></> : null}
          {load.level !== 'spike' && load.level !== 'caution' ? `. ${load.message}` : ''}
        </div>
      </div>

      {activeGoals.map(g => {
        const w = currentWeekIndex(g, t)
        return (
          <button key={g.id} className="card tight" onClick={() => nav.go('goals')}>
            <div className="row">
              <span className="cat-badge" style={{ width: 34, height: 34, background: GOAL_TINT[g.type] }}><Icon name={GOAL_ICON[g.type]} size={19} stroke={2} /></span>
              <b className="grow">{GOALS[g.type].title}</b>
              <span className="small muted">{w ? `Week ${w} of ${g.weeks}` : t < g.startDate ? 'Starts soon' : 'Complete'}</span>
              <Icon name="right" size={16} className="chev" />
            </div>
          </button>
        )
      })}

      <InstallPrompt />
    </>
  )
}

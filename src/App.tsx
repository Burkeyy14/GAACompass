import { useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { cloudBackend, localBackend, supabase } from './lib/backend'
import { StoreProvider, useStore } from './lib/store'
import { COUNTIES } from './lib/counties'
import { DEMO, lsGet, lsSet } from './lib/env'
import type { ProgramSession } from './lib/programs'
import type { SessionLog } from './lib/types'
import { AuthScreen, ResetPassword } from './screens/Auth'
import { Onboarding } from './screens/ProfileForm'
import { Today } from './screens/Today'
import { Planner } from './screens/Planner'
import { Train } from './screens/Train'
import { Goals } from './screens/Goals'
import { Progress } from './screens/Progress'
import { Settings, ProSheet, FeedbackSheet } from './screens/Settings'
import { ProProvider, usePro } from './lib/account'
import { emptyData } from './lib/defaults'
import type { AppData, CollectionKey } from './lib/types'
import { CheckInForm } from './screens/CheckIn'
import { QuickLog } from './screens/LogSession'
import { Player } from './screens/Player'
import { SessionDetail, Sheet, Banner } from './components/ui'
import { Icon, type IconName } from './components/Icon'

const LOCAL_FLAG = 'gaa-compass:use-local'

export type OpenSheet =
  | { kind: 'checkin' }
  | { kind: 'log'; prefill?: Partial<SessionLog> }
  | { kind: 'session'; session: ProgramSession; note?: string; ref?: string }
  | { kind: 'settings' }
  | { kind: 'pro' }
  | { kind: 'feedback' }

export interface Nav {
  open: (s: OpenSheet) => void
  go: (t: Tab) => void
  start: (session: ProgramSession, ref?: string, note?: string) => void
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(!supabase)
  const [useLocal, setUseLocal] = useState(() => DEMO || lsGet(LOCAL_FLAG) === '1')
  const [recovering, setRecovering] = useState(false)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthReady(true)
    })
    const { data } = supabase.auth.onAuthStateChange((e, s) => {
      setSession(s)
      if (e === 'PASSWORD_RECOVERY') setRecovering(true)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const userId = session?.user.id ?? null
  const backend = useMemo(() => (userId ? cloudBackend(userId) : useLocal ? localBackend() : null), [userId, useLocal])

  if (!authReady) return <Splash />
  if (recovering) {
    return (
      <>
        <Ambient />
        <ResetPassword onDone={() => setRecovering(false)} />
      </>
    )
  }
  if (!backend) {
    return (
      <>
        <Ambient />
        <AuthScreen
          onLocal={() => {
            lsSet(LOCAL_FLAG, '1')
            setUseLocal(true)
          }}
        />
      </>
    )
  }

  return (
    <ProProvider userId={userId}>
    <StoreProvider backend={backend}>
      <Shell
        email={session?.user.email ?? null}
        onSignOut={async () => {
          lsSet(LOCAL_FLAG, null)
          setUseLocal(false)
          if (supabase && session) await supabase.auth.signOut()
          setSession(null)
        }}
      />
    </StoreProvider>
    </ProProvider>
  )
}

export function Ambient() {
  return (
    <div className="ambient" aria-hidden>
      <i />
      <i />
      <i />
    </div>
  )
}

function Splash() {
  return (
    <div className="auth center" style={{ alignItems: 'center' }}>
      <Ambient />
      <div className="brand" style={{ alignItems: 'center' }}>
        <div className="logo"><Icon name="compass" size={34} /></div>
      </div>
    </div>
  )
}

export type Tab = 'today' | 'plan' | 'train' | 'goals' | 'progress'
const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'today', label: 'Today', icon: 'home' },
  { id: 'plan', label: 'Week', icon: 'calendar' },
  { id: 'train', label: 'Train', icon: 'train' },
  { id: 'goals', label: 'Goals', icon: 'goal' },
  { id: 'progress', label: 'Progress', icon: 'chart' },
]

function useCountyTheme(county: string) {
  useEffect(() => {
    const c = COUNTIES[county] ?? COUNTIES.default
    const root = document.documentElement.style
    root.setProperty('--main', c.main)
    root.setProperty('--stripe', c.stripe)
    const hex = c.main.replace('#', '')
    const [r, g, b] = [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16))
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    root.setProperty('--on-accent', lum > 0.62 ? '#111' : '#fff')
    document.querySelector('meta[name=theme-color]')?.setAttribute('content', c.main)
  }, [county])
}

function Shell({ email, onSignOut }: { email: string | null; onSignOut: () => void }) {
  const { data, ready, updateProfile, backend, replaceAll } = useStore()
  const pro = usePro()
  const [welcomePro, setWelcomePro] = useState(() => new URLSearchParams(location.search).get('pro') === 'success')
  const [importOffer, setImportOffer] = useState<AppData | null>(null)

  // Signed in for the first time on a device that was used without an account: offer to bring that data along.
  useEffect(() => {
    if (!ready || backend.mode !== 'cloud') return
    try {
      const raw = lsGet('gaa-compass:local')
      if (!raw) return
      const local = { ...emptyData(), ...(JSON.parse(raw) as Partial<AppData>) }
      const count = local.checkins.length + local.sessions.length + local.frees.length + local.goals.length
      if (count > 0 || local.profile?.onboarded) setImportOffer(local)
    } catch {
      /* ignore */
    }
  }, [ready, backend.mode])

  useEffect(() => {
    if (new URLSearchParams(location.search).has('pro')) history.replaceState(null, '', '/')
  }, [])
  const [tab, setTab] = useState<Tab>('today')
  const [sheet, setSheet] = useState<OpenSheet | null>(null)
  const [player, setPlayer] = useState<{ session: ProgramSession; ref?: string; note?: string } | null>(null)
  useCountyTheme(data.profile.county)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [tab])

  if (!ready) return <Splash />

  if (importOffer) {
    const finish = () => {
      lsSet('gaa-compass:local', null)
      setImportOffer(null)
    }
    return (
      <>
        <Ambient />
        <div className="auth">
          <div className="brand"><div className="logo"><Icon name="cloud" size={34} /></div><h1 style={{ fontSize: 30 }}>Bring your data with you?</h1></div>
          <div className="card small">
            This device has training data from before you signed in: {importOffer.checkins.length} check-ins, {importOffer.sessions.length} sessions, {importOffer.frees.length} free-taking sessions and {importOffer.goals.length} goals. Add it to your account so it's on every device?
          </div>
          <button
            className="btn block lg"
            onClick={async () => {
              const merged: AppData = { ...data, profile: data.profile.onboarded ? data.profile : importOffer.profile }
              for (const k of ['checkins', 'weekPlans', 'sessions', 'frees', 'goals', 'benchmarks'] as CollectionKey[]) {
                const ids = new Set((data[k] as { id: string }[]).map(r => r.id))
                ;(merged[k] as { id: string }[]) = [...(data[k] as { id: string }[]), ...(importOffer[k] as { id: string }[]).filter(r => !ids.has(r.id))]
              }
              await replaceAll(merged)
              finish()
            }}
          >
            Add to my account
          </button>
          <button className="btn glassy block" onClick={finish}>No, start fresh</button>
        </div>
      </>
    )
  }

  if (!data.profile.onboarded) {
    return (
      <>
        <Ambient />
        <div className="app">
          <main style={{ paddingTop: 'calc(env(safe-area-inset-top) + 20px)', paddingBottom: 40 }}>
            <Onboarding initial={data.profile} onSave={updateProfile} />
          </main>
        </div>
      </>
    )
  }

  const county = COUNTIES[data.profile.county] ?? COUNTIES.default
  const close = () => setSheet(null)
  const nav: Nav = {
    open: setSheet,
    go: setTab,
    start: (session, ref, note) => {
      setSheet(null)
      setPlayer({ session, ref, note })
    },
  }
  const initials = (data.profile.name || 'Me').trim().slice(0, 1).toUpperCase()
  const done = (ref?: string) => !!ref && data.sessions.some(s => s.programRef === ref)

  return (
    <>
      <Ambient />
      <div className="app">
        <header className="topbar">
          <div className="mark"><Icon name="compass" size={18} stroke={2} /></div>
          <div className="t">
            GAA Compass
            <small>{data.profile.county !== 'default' ? county.name : TABS.find(t => t.id === tab)?.label}</small>
          </div>
          <button className="pill accent" style={{ border: 0, height: 30 }} onClick={() => setSheet({ kind: 'feedback' })}>
            Beta · Feedback
          </button>
          <button className="avatar" aria-label="Profile & settings" onClick={() => setSheet({ kind: 'settings' })} style={pro.pro ? { boxShadow: '0 0 0 2px #ffb800, var(--shadow)' } : undefined}>{initials}</button>
        </header>

        <main>
          {welcomePro && (
            <button className="banner green" style={{ border: 0, textAlign: 'left' }} onClick={() => setWelcomePro(false)}>
              <Icon name="star" size={18} />
              <div><b>Welcome to Pro!</b> {pro.pro ? 'Everything is unlocked.' : 'Unlocking now. This can take a few seconds.'}</div>
            </button>
          )}
          {tab === 'today' && <Today nav={nav} />}
          {tab === 'plan' && <Planner nav={nav} />}
          {tab === 'train' && <Train nav={nav} />}
          {tab === 'goals' && <Goals nav={nav} />}
          {tab === 'progress' && <Progress nav={nav} />}
        </main>

        <nav className="tabbar">
          {TABS.map(t => (
            <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>
              <Icon name={t.icon} size={23} stroke={tab === t.id ? 2.1 : 1.8} />
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {sheet?.kind === 'checkin' && (
        <Sheet onClose={close} title="Daily check-in">
          <CheckInForm onDone={close} />
        </Sheet>
      )}
      {sheet?.kind === 'log' && (
        <Sheet onClose={close} title="Quick log">
          <QuickLog prefill={sheet.prefill} onDone={close} />
        </Sheet>
      )}
      {sheet?.kind === 'session' && (
        <Sheet onClose={close} title="Session">
          {sheet.note && <Banner kind="amber">{sheet.note}</Banner>}
          <SessionDetail s={sheet.session} />
          {done(sheet.ref) ? (
            <Banner kind="green">Done. It's ticked off in your week.</Banner>
          ) : (
            <button className="btn block lg" onClick={() => nav.start(sheet.session, sheet.ref, sheet.note)}>
              <Icon name="play" size={18} /> Start session
            </button>
          )}
        </Sheet>
      )}
      {sheet?.kind === 'settings' && (
        <Sheet onClose={close} title="Profile & settings">
          <Settings email={email} onSignOut={onSignOut} openPro={() => setSheet({ kind: 'pro' })} openFeedback={() => setSheet({ kind: 'feedback' })} onClose={close} />
        </Sheet>
      )}
      {sheet?.kind === 'pro' && (
        <Sheet onClose={close} title="GAA Compass Pro">
          <ProSheet onDone={close} />
        </Sheet>
      )}
      {sheet?.kind === 'feedback' && (
        <Sheet onClose={close} title="Send feedback">
          <FeedbackSheet screen={tab} email={email} onDone={close} />
        </Sheet>
      )}
      {player && <Player session={player.session} programRef={player.ref} note={player.note} onClose={() => setPlayer(null)} />}
    </>
  )
}

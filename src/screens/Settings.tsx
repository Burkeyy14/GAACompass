import { useEffect, useState } from 'react'
import { ask, DEMO } from '../lib/env'
import { useStore } from '../lib/store'
import { supabase } from '../lib/backend'
import { emptyData } from '../lib/defaults'
import { sampleData } from '../lib/sample'
import { api, APP_VERSION, PRICE_LABEL, usePro } from '../lib/account'
import { ProfileForm } from './ProfileForm'
import { InstallPrompt } from '../components/InstallPrompt'
import { Banner } from '../components/ui'
import { Icon } from '../components/Icon'
import { ProBadge } from './ProFeatures'

export function Settings({ email, onSignOut, openPro, openFeedback, onClose: _onClose }: { email: string | null; onSignOut: () => void; openPro: () => void; openFeedback: () => void; onClose: () => void }) {
  const { data, backend, updateProfile, replaceAll } = useStore()
  const pro = usePro()
  const [deleting, setDeleting] = useState(false)
  const [openSection, setOpenSection] = useState<string | null>(null)

  function toggleSection(s: string) { setOpenSection(x => x === s ? null : s) }

  function exportData() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `gaa-compass-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
  }

  async function deleteAccount() {
    if (!ask('Delete your account and ALL your data permanently? Any Pro subscription is cancelled. This cannot be undone.')) return
    setDeleting(true)
    try {
      await api('delete-account', {})
      await supabase?.auth.signOut()
      onSignOut()
    } catch (e) {
      alert((e as Error).message)
      setDeleting(false)
    }
  }

  return (
    <>
      <button className="card tight" onClick={openFeedback} style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--accent) 16%, var(--glass)), var(--glass))' }}>
        <div className="row">
          <span className="cat-badge" style={{ width: 38, height: 38, background: 'linear-gradient(145deg, var(--accent), color-mix(in srgb, var(--accent) 60%, #000))' }}><Icon name="edit" size={19} stroke={2} /></span>
          <div className="grow">
            <b>Send feedback</b>
            <div className="tiny muted">You're on the beta. Tell me what to fix or add.</div>
          </div>
          <Icon name="right" size={18} className="chev" />
        </div>
      </button>

      <div className="card flush">
        <div className="list">
          {(['About you', 'Your game', 'Your week'] as const).map(section => (
            <div key={section}>
              <button
                className="li no-icon"
                onClick={() => toggleSection(section)}
                aria-expanded={openSection === section}
              >
                <Icon name="user" size={20} style={{ opacity: 0.6 }} />
                <span className="grow title">{section}</span>
                <Icon name={openSection === section ? 'down' : 'right'} size={18} className="chev" />
              </button>
              {openSection === section && (
                <div style={{ padding: '0 16px 16px' }}>
                  <ProfileForm
                    initial={data.profile}
                    cta="Save"
                    onSave={p => { updateProfile(p); setOpenSection(null) }}
                    section={section}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="section-label">Plan</div>
      <div className="card stack">
        {pro.pro ? (
          <>
            <div className="row between"><b>You're on Pro</b><ProBadge /></div>
            <div className="small muted">
              {pro.local ? 'Unlocked on this device only.' : pro.source === 'beta' ? 'Unlocked with a beta code. Thanks for testing!' : pro.renews ? `Renews ${new Date(pro.renews).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' })}.` : 'Thanks for supporting GAA Compass.'}
            </div>
            {pro.source === 'stripe' && <ManageSubscription />}
          </>
        ) : (
          <>
            <div className="small muted">Free includes check-ins, auto-adjusting training, the planner, workouts and free-taking. Pro adds multiple goals, a strength tracker, readiness insights and shot maps.</div>
            <button className="btn tonal" onClick={openPro}><Icon name="star" size={18} /> See Pro</button>
          </>
        )}
      </div>

      <div className="section-label">Account</div>
      <div className="card stack">
        {backend.mode === 'cloud' ? (
          <>
            <div className="row small"><Icon name="cloud" size={20} /><span>Signed in as <b>{email}</b>. Your data syncs to every device.</span></div>
            {backend.pending() > 0 && <Banner kind="amber">{backend.pending()} change(s) waiting to sync. They'll upload when you're back online.</Banner>}
          </>
        ) : (
          <div className="small">
            You're using the app <b>without an account</b>, so your data is only saved in this browser.
            {supabase ? ' Create an account to keep it safe and use it on any device. Your data here comes with you.' : ''}
          </div>
        )}
        <button className="btn plain" onClick={onSignOut}><Icon name="logout" size={18} /> {backend.mode === 'cloud' ? 'Sign out' : supabase ? 'Create account / sign in' : 'Back to start'}</button>
      </div>

      <InstallPrompt force />

      <div className="section-label">Your data</div>
      <div className="card flush">
        <div className="list">
          <button className="li no-icon" onClick={exportData}><Icon name="download" size={20} /><span className="grow title">Export my data</span></button>
          <button className="li no-icon" onClick={async () => { if (ask('Replace your data with 5 weeks of sample data?')) await replaceAll(sampleData()) }}>
            <Icon name="sparkle" size={20} /><span className="grow title">Load sample data</span>
          </button>
          <button
            className="li no-icon"
            style={{ color: 'var(--red)' }}
            onClick={async () => {
              if (!ask('Delete ALL your check-ins, sessions, plans and goals? Your account stays. This cannot be undone.')) return
              for (const k of ['checkins', 'weekPlans', 'sessions', 'frees', 'goals', 'benchmarks'] as const) for (const r of data[k] as { id: string }[]) await backend.del(k, r.id)
              await replaceAll({ ...emptyData(), profile: data.profile })
            }}
          >
            <Icon name="trash" size={20} /><span className="grow title">Clear my training data</span>
          </button>
          {backend.mode === 'cloud' && (
            <button className="li no-icon" style={{ color: 'var(--red)' }} onClick={deleteAccount} disabled={deleting}>
              <Icon name="x" size={20} /><span className="grow title">{deleting ? 'Deleting…' : 'Delete my account'}</span>
            </button>
          )}
        </div>
      </div>

      <p className="disclaimer">
        GAA Compass gives general training guidance based on sports-science research (e.g. Saw et al. 2016; Meeusen et al. 2013). It is not medical advice. If you're injured, in pain or unsure, see a chartered physiotherapist or doctor.
        <br />
        Version {APP_VERSION}
      </p>
    </>
  )
}

function ManageSubscription() {
  const [busy, setBusy] = useState(false)
  return (
    <button
      className="btn plain"
      disabled={busy}
      onClick={async () => {
        setBusy(true)
        try {
          const { url } = await api<{ url: string }>('portal', {})
          location.href = url
        } catch (e) {
          alert((e as Error).message)
          setBusy(false)
        }
      }}
    >
      {busy ? 'Opening…' : 'Manage subscription'}
    </button>
  )
}

const PRO_FEATURES: [string, string, string][] = [
  ['goal', 'Multiple goals at once', 'Run speed and frees side by side. Plans are merged into one week.'],
  ['dumbbell', 'Strength tracker', 'Estimated maxes and personal bests for every lift you log.'],
  ['pulse', 'Readiness insights', "What's dragging your recovery down, and which days you're worst."],
  ['trend', 'Load ratio trend', 'Ten weeks of load spikes, so you can see injury risk building.'],
  ['ball', 'Shot maps', 'Every free on one pitch, with accuracy by side and type of free.'],
]

export function ProSheet({ onDone }: { onDone: () => void }) {
  const pro = usePro()
  const [payments, setPayments] = useState<boolean | null>(DEMO ? false : null)
  const [busy, setBusy] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [msg, setMsg] = useState<{ kind: 'red' | 'green'; text: string } | null>(null)

  useEffect(() => {
    if (DEMO || pro.local) return
    api<{ payments: boolean }>('health').then(h => setPayments(!!h.payments)).catch(() => setPayments(false))
  }, [pro.local])

  async function checkout(interval: 'month' | 'year') {
    setBusy(interval)
    setMsg(null)
    try {
      const { url } = await api<{ url: string }>('checkout', { interval })
      location.href = url
    } catch (e) {
      setMsg({ kind: 'red', text: (e as Error).message })
      setBusy(null)
    }
  }

  async function redeem() {
    setBusy('code')
    setMsg(null)
    try {
      await api('redeem', { code })
      await pro.refresh()
      setMsg({ kind: 'green', text: 'Pro unlocked. Enjoy!' })
      setTimeout(onDone, 1200)
    } catch (e) {
      setMsg({ kind: 'red', text: (e as Error).message })
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="stack">
      <div className="card flush">
        <div className="list">
          {PRO_FEATURES.map(([icon, title, text]) => (
            <div className="li" key={title}>
              <span className="cat-badge" style={{ width: 36, height: 36, background: 'linear-gradient(145deg, #ffcc00, #ff9f0a)' }}><Icon name={icon} size={19} stroke={2} /></span>
              <div className="grow">
                <div className="title">{title}</div>
                <div className="sub">{text}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="tiny muted center">Daily check-ins, auto-adjusting training and injury warnings always stay free.</div>

      {pro.pro ? (
        <Banner kind="green" icon="star">You already have Pro.</Banner>
      ) : pro.local ? (
        <>
          <Banner kind="info">Create a free account to get Pro on all your devices.</Banner>
          <button className="btn plain" onClick={() => { pro.setLocalPro(true); onDone() }}>Try Pro on this device</button>
        </>
      ) : (
        <>
          {payments && (
            <div className="grid2">
              <button className="btn lg" style={{ flexDirection: 'column', gap: 0, height: 66 }} disabled={!!busy} onClick={() => checkout('year')}>
                <span>{busy === 'year' ? 'Opening…' : 'Yearly'}</span>
                <span className="tiny" style={{ opacity: 0.85, fontWeight: 600 }}>{PRICE_LABEL.year}</span>
              </button>
              <button className="btn glassy lg" style={{ flexDirection: 'column', gap: 0, height: 66 }} disabled={!!busy} onClick={() => checkout('month')}>
                <span>{busy === 'month' ? 'Opening…' : 'Monthly'}</span>
                <span className="tiny muted" style={{ fontWeight: 600 }}>{PRICE_LABEL.month}</span>
              </button>
            </div>
          )}
          {payments === false && <div className="small muted center">Payments open soon. Got a beta code? Enter it below.</div>}
          <div className="card stack">
            <b>Have a beta code?</b>
            <div className="row">
              <input type="text" placeholder="e.g. DOORA2026" value={code} onChange={e => setCode(e.target.value.toUpperCase())} autoCapitalize="characters" />
              <button className="btn sm" style={{ height: 46 }} disabled={!code || !!busy} onClick={redeem}>{busy === 'code' ? '…' : 'Redeem'}</button>
            </div>
          </div>
          {msg && <Banner kind={msg.kind}>{msg.text}</Banner>}
          {payments && <div className="tiny muted center">Secure payment by Stripe. Cancel any time from Settings.</div>}
        </>
      )}
    </div>
  )
}

export function FeedbackSheet({ screen, email, onDone }: { screen: string; email: string | null; onDone: () => void }) {
  const { backend } = useStore()
  const [rating, setRating] = useState(0)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'red' | 'green'; text: string } | null>(null)
  const canSend = backend.mode === 'cloud' && !!supabase

  async function send() {
    if (!supabase) return
    setBusy(true)
    const { error } = await supabase.from('feedback').insert({
      message: message.trim(),
      rating: rating || null,
      screen,
      email,
      app_version: APP_VERSION,
      user_agent: navigator.userAgent.slice(0, 300),
    })
    setBusy(false)
    if (error) setMsg({ kind: 'red', text: "Couldn't send. Check your connection and try again." })
    else {
      setMsg({ kind: 'green', text: 'Thanks! Feedback sent.' })
      setTimeout(onDone, 1200)
    }
  }

  return (
    <div className="stack">
      <div className="card stack">
        <div className="small muted">How are you finding GAA Compass?</div>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          {[1, 2, 3, 4, 5].map(n => (
            <button key={n} className="icon-btn" style={{ width: 52, height: 52, background: rating >= n ? 'color-mix(in srgb, #ffcc00 25%, transparent)' : 'var(--fill)', color: rating >= n ? '#ff9f0a' : 'var(--muted)' }} onClick={() => setRating(n)} aria-label={`${n} stars`}>
              <Icon name="star" size={24} stroke={2} />
            </button>
          ))}
        </div>
        <textarea style={{ minHeight: 130 }} placeholder="What's working, what's confusing, what's missing? Bugs, ideas, anything." value={message} onChange={e => setMessage(e.target.value)} maxLength={4000} />
      </div>
      {msg && <Banner kind={msg.kind}>{msg.text}</Banner>}
      {canSend ? (
        <button className="btn block lg" disabled={busy || message.trim().length < 2} onClick={send}>{busy ? 'Sending…' : 'Send feedback'}</button>
      ) : (
        <Banner kind="info">Sign in to send feedback from the app.</Banner>
      )}
    </div>
  )
}

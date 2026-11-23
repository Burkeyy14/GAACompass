import { useState, type FormEvent } from 'react'
import { cloudAvailable, supabase } from '../lib/backend'
import { friendlyAuthError } from '../lib/account'
import { InstallPrompt } from '../components/InstallPrompt'
import { Banner } from '../components/ui'
import { CatBadge, Icon } from '../components/Icon'

const FEATURES: [string, string][] = [
  ['recovery', '30-second check-in that sets how hard you train'],
  ['speed', 'Plans for speed, explosiveness, strength and fitness'],
  ['gym', 'Guided workouts with sets, reps and rest timers'],
  ['skills', 'Free-taking tracker with accuracy by distance'],
]

type Mode = 'signup' | 'signin' | 'forgot' | 'check-email' | 'reset-sent'

function PasswordInput({ value, onChange, autoComplete }: { value: string; onChange: (v: string) => void; autoComplete: string }) {
  const [show, setShow] = useState(false)
  return (
    <div className="unit-input">
      <input type={show ? 'text' : 'password'} autoComplete={autoComplete} minLength={8} required value={value} onChange={e => onChange(e.target.value)} style={{ paddingRight: 64 }} />
      <button type="button" className="link small" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }} onClick={() => setShow(s => !s)}>
        {show ? 'Hide' : 'Show'}
      </button>
    </div>
  )
}

export function AuthScreen({ onLocal }: { onLocal: () => void }) {
  const [mode, setMode] = useState<Mode>('signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setBusy(true)
    setErr(null)
    setInfo(null)
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } })
        if (error) throw error
        // Supabase returns a user with no identities if the email is already registered
        if (data.user && data.user.identities && data.user.identities.length === 0) throw new Error('already registered')
        if (!data.session) setMode('check-email')
      } else if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/?reset=1` })
        if (error) throw error
        setMode('reset-sent')
      }
    } catch (e) {
      setErr(friendlyAuthError((e as Error).message))
    } finally {
      setBusy(false)
    }
  }

  async function resend() {
    if (!supabase) return
    const { error } = await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: window.location.origin } })
    setInfo(error ? friendlyAuthError(error.message) : 'Sent again. Check your inbox and spam folder.')
  }

  return (
    <div className="auth">
      <div className="brand">
        <div className="logo"><Icon name="compass" size={36} /></div>
        <div>
          <h1>GAA Compass</h1>
          <div className="muted" style={{ fontSize: 17, marginTop: 2 }}>Train smarter. Stay on the pitch.</div>
        </div>
      </div>

      {(mode === 'signup' || mode === 'signin') && (
        <div className="card stack">
          {FEATURES.map(([cat, text]) => (
            <div className="feature" key={text}><CatBadge cat={cat} size={34} />{text}</div>
          ))}
        </div>
      )}

      {!cloudAvailable ? (
        <Banner kind="info">Accounts aren't connected yet. You can use the app in this browser.</Banner>
      ) : mode === 'check-email' ? (
        <div className="card stack center">
          <div className="cat-badge" style={{ width: 56, height: 56, margin: '0 auto', background: 'linear-gradient(145deg, var(--accent), color-mix(in srgb, var(--accent) 60%, #000))' }}><Icon name="check" size={30} stroke={2.4} /></div>
          <h3 style={{ fontSize: 20 }}>Check your email</h3>
          <div className="small muted">We sent a link to <b style={{ color: 'var(--ink)' }}>{email}</b>. Tap it to confirm your account, then come back here and sign in.</div>
          {info && <div className="small">{info}</div>}
          <button className="btn plain" onClick={resend}>Resend email</button>
          <button className="link small" style={{ alignSelf: 'center' }} onClick={() => setMode('signin')}>Back to sign in</button>
        </div>
      ) : mode === 'reset-sent' ? (
        <div className="card stack center">
          <h3 style={{ fontSize: 20 }}>Reset link sent</h3>
          <div className="small muted">If there's an account for <b style={{ color: 'var(--ink)' }}>{email}</b>, you'll get an email with a link to set a new password.</div>
          <button className="link small" style={{ alignSelf: 'center' }} onClick={() => setMode('signin')}>Back to sign in</button>
        </div>
      ) : (
        <form className="card stack" onSubmit={submit}>
          {mode !== 'forgot' ? (
            <div className="seg">
              <button type="button" className={mode === 'signup' ? 'on' : ''} onClick={() => { setMode('signup'); setErr(null) }}>Create account</button>
              <button type="button" className={mode === 'signin' ? 'on' : ''} onClick={() => { setMode('signin'); setErr(null) }}>Sign in</button>
            </div>
          ) : (
            <div>
              <h3 style={{ fontSize: 19 }}>Reset your password</h3>
              <div className="small muted" style={{ marginTop: 4 }}>Enter your email and we'll send you a link.</div>
            </div>
          )}
          <label className="field">
            Email
            <input type="email" autoComplete="email" inputMode="email" required value={email} onChange={e => setEmail(e.target.value)} />
          </label>
          {mode !== 'forgot' && (
            <label className="field">
              Password{mode === 'signup' && <span style={{ fontWeight: 500 }}> (at least 8 characters)</span>}
              <PasswordInput value={password} onChange={setPassword} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
            </label>
          )}
          {err && <Banner kind="red">{err}</Banner>}
          <button className="btn block lg" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'signup' ? 'Create free account' : mode === 'signin' ? 'Sign in' : 'Send reset link'}
          </button>
          {mode === 'signin' && <button type="button" className="link small" style={{ alignSelf: 'center' }} onClick={() => { setMode('forgot'); setErr(null) }}>Forgot password?</button>}
          {mode === 'forgot' && <button type="button" className="link small" style={{ alignSelf: 'center' }} onClick={() => setMode('signin')}>Back to sign in</button>}
          {mode === 'signup' && <div className="tiny muted center">By creating an account you agree that your training data is stored securely so you can use it on any device. You can delete it at any time.</div>}
        </form>
      )}

      <button className="btn glassy block" onClick={onLocal}>
        {cloudAvailable ? 'Try it first without an account' : 'Start'}
      </button>
      <InstallPrompt />
      <p className="disclaimer center">GAA Compass gives general training guidance, not medical advice. If you're injured or in pain, see a physio or doctor.</p>
    </div>
  )
}

/** Shown after the player taps the password-reset link in their email. */
export function ResetPassword({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  return (
    <div className="auth">
      <div className="brand">
        <div className="logo"><Icon name="compass" size={36} /></div>
        <h1 style={{ fontSize: 30 }}>Set a new password</h1>
      </div>
      <form
        className="card stack"
        onSubmit={async e => {
          e.preventDefault()
          if (!supabase) return
          setBusy(true)
          const { error } = await supabase.auth.updateUser({ password })
          setBusy(false)
          if (error) setErr(friendlyAuthError(error.message))
          else {
            history.replaceState(null, '', '/')
            onDone()
          }
        }}
      >
        <label className="field">
          New password
          <PasswordInput value={password} onChange={setPassword} autoComplete="new-password" />
        </label>
        {err && <Banner kind="red">{err}</Banner>}
        <button className="btn block lg" disabled={busy || password.length < 8}>{busy ? 'Saving…' : 'Save password'}</button>
      </form>
    </div>
  )
}

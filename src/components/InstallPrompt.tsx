import { Icon } from './Icon'
import { lsGet, lsSet } from '../lib/env'
import { useEffect, useState } from 'react'

interface BIPEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: BIPEvent | null = null
const listeners = new Set<() => void>()
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault()
    deferred = e as BIPEvent
    listeners.forEach(l => l())
  })
}

export function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true
}

export function isIOS() {
  const ua = navigator.userAgent
  return /iphone|ipad|ipod/i.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1)
}

function isMobile() {
  return isIOS() || /android/i.test(navigator.userAgent)
}

/** Shows "Install app" on Android/desktop Chrome, and Add-to-Home-Screen steps on iPhone. */
export function InstallPrompt({ force }: { force?: boolean }) {
  const [, tick] = useState(0)
  const [hidden, setHidden] = useState(() => !force && lsGet('gaa-compass:install-dismissed') === '1')

  useEffect(() => {
    const l = () => tick(t => t + 1)
    listeners.add(l)
    return () => void listeners.delete(l)
  }, [])

  if (isStandalone()) return force ? <div className="banner green"><Icon name="check" size={18} stroke={2.2} /><div>Installed. You're using the app from your home screen.</div></div> : null
  if (hidden) return null

  const dismiss = () => {
    lsSet('gaa-compass:install-dismissed', '1')
    setHidden(true)
  }

  if (deferred) {
    return (
      <div className="card tight row between">
        <div>
          <b className="row" style={{ gap: 8 }}><Icon name="download" size={18} /> Install GAA Compass</b>
          <div className="small muted">Adds it to your home screen like a normal app.</div>
        </div>
        <div className="row">
          <button
            className="btn sm"
            onClick={async () => {
              await deferred!.prompt()
              deferred = null
              tick(t => t + 1)
            }}
          >
            Install
          </button>
          {!force && <button className="icon-btn" style={{ width: 30, height: 30 }} onClick={dismiss} aria-label="Dismiss"><Icon name="x" size={14} stroke={2.2} /></button>}
        </div>
      </div>
    )
  }

  if (isIOS()) {
    return (
      <div className="card tight">
        <div className="row between">
          <b className="row" style={{ gap: 8 }}><Icon name="share" size={18} /> Add to your Home Screen</b>
          {!force && <button className="icon-btn" style={{ width: 30, height: 30 }} onClick={dismiss} aria-label="Dismiss"><Icon name="x" size={14} stroke={2.2} /></button>}
        </div>
        <ol className="small" style={{ margin: '6px 0 0', paddingLeft: 18, lineHeight: 1.6 }}>
          <li>Open this page in <b>Safari</b></li>
          <li>Tap the <b>Share</b> button <Icon name="share" size={14} style={{ verticalAlign: -2 }} /></li>
          <li>Scroll and tap <b>Add to Home Screen</b></li>
        </ol>
      </div>
    )
  }

  if (force || isMobile()) {
    return (
      <div className="card tight">
        <b className="row" style={{ gap: 8 }}><Icon name="download" size={18} /> Install on your phone</b>
        <div className="small muted" style={{ marginTop: 4 }}>
          Android (Chrome): menu ⋮ → <b>Install app</b> / <b>Add to Home screen</b>. iPhone (Safari): Share → <b>Add to Home Screen</b>.
        </div>
      </div>
    )
  }
  return null
}

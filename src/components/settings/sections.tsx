import { useEffect, useRef, useState } from 'react'
import { Copy, Download, ExternalLink, KeyRound, LogOut, Play, Shield, Trash2, Upload } from 'lucide-react'
import { isStaff, signOut, updatePassword, useAccount } from '../../lib/account'
import { cloudEnabled } from '../../lib/supabase'
import { AuthForm } from '../AuthForm'
import { useStore, type AlarmSound } from '../../store'
import { playAlarm } from '../../lib/audio'
import { BUILT_IN_CLIENT_ID, clientIdFor, isConnected, login, logout, redirectUri } from '../../lib/spotify'
import { toast } from '../../hooks'
import { QUOTES } from '../../lib/quotes'
import { Row, Section, Seg, Stepper, Toggle } from './controls'
import { SpotifyGlyph } from '../panels/MusicPanel'

/* --------------------------------------------------------------- clock */

export function ClockSection() {
  const c = useStore((s) => s.settings.clock)
  const updateClock = useStore((s) => s.updateClock)
  const setSection = useStore((s) => s.setSection)
  return (
    <Section title="Clock" sub="How time is written everywhere in floe.">
      <Row label="Time format">
        <Seg value={c.format} onChange={(v) => updateClock({ format: v })} options={[{ v: '12', label: '12h' }, { v: '24', label: '24h' }]} />
      </Row>
      <Row label="Show seconds"><Toggle on={c.seconds} onChange={(v) => updateClock({ seconds: v })} /></Row>
      {c.format === '12' && <Row label="Show AM / PM"><Toggle on={c.ampm} onChange={(v) => updateClock({ ampm: v })} /></Row>}
      <Row label="Clock & timer styles" hint="Each mode has its own style, progress and companion">
        <button className="btn sm ghost" onClick={() => setSection('modes')}>Customize modes</button>
      </Row>
    </Section>
  )
}

/* --------------------------------------------------------------- timer */

const SOUNDS: { v: AlarmSound; label: string }[] = [
  { v: 'bell', label: 'Bell' }, { v: 'chime', label: 'Chime' }, { v: 'soft', label: 'Soft' }, { v: 'digital', label: 'Digital' }, { v: 'none', label: 'None' },
]

export function TimerSection() {
  const t = useStore((s) => s.settings.timer)
  const up = useStore((s) => s.updateTimerSettings)
  const enableNotify = async (v: boolean) => {
    if (v && 'Notification' in window && Notification.permission !== 'granted') {
      const p = await Notification.requestPermission()
      if (p !== 'granted') { toast('Notifications are blocked in your browser'); return }
    }
    up({ notify: v })
  }
  return (
    <>
      <Section title="Focus Timer" sub="Durations in minutes.">
        <div className="dur-grid">
          {([['focus', 'Focus', 1, 180], ['short', 'Short break', 1, 60], ['long', 'Long break', 1, 90]] as const).map(([k, label, min, max]) => (
            <div key={k} className={`dur dur-${k}`}>
              <span className="muted small">{label}</span>
              <Stepper value={t[k]} min={min} max={max} onChange={(v) => up({ [k]: v })} />
            </div>
          ))}
        </div>
        <Row label="Long break every" hint="Number of focus sessions before a long break">
          <Stepper value={t.longEvery} min={2} max={10} onChange={(v) => up({ longEvery: v })} />
        </Row>
        <Row label="Auto-start breaks"><Toggle on={t.autoBreaks} onChange={(v) => up({ autoBreaks: v })} /></Row>
        <Row label="Auto-start focus" hint="Start the next session automatically after a break"><Toggle on={t.autoFocus} onChange={(v) => up({ autoFocus: v })} /></Row>
      </Section>
      <Section title="Alerts">
        <Row label="Alarm sound">
          <div className="row-inline">
            <select value={t.sound} onChange={(e) => up({ sound: e.target.value as AlarmSound })}>
              {SOUNDS.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
            </select>
            <button className="icon-btn glass sm" onClick={() => playAlarm(t.sound, t.volume)} aria-label="Preview sound"><Play size={14} /></button>
          </div>
        </Row>
        <Row label="Volume">
          <input type="range" min={0} max={1} step={0.01} value={t.volume} onChange={(e) => up({ volume: Number(e.target.value) })} style={{ ['--v' as string]: t.volume }} />
        </Row>
        <Row label="Desktop notifications"><Toggle on={t.notify} onChange={(v) => void enableNotify(v)} /></Row>
        <Row label="Countdown in tab title"><Toggle on={t.tabTitle} onChange={(v) => up({ tabTitle: v })} /></Row>
      </Section>
    </>
  )
}

/* -------------------------------------------------------------- quotes */

export function QuotesSection() {
  const q = useStore((s) => s.settings.quotes)
  const up = useStore((s) => s.updateQuotes)
  const [text, setText] = useState('')
  return (
    <Section title="Quotes" sub="A line of motivation in the corner of your Home screen.">
      <Row label="Show quotes"><Toggle on={q.show} onChange={(v) => up({ show: v })} /></Row>
      <Row label="New quote">
        <select value={q.rotate} onChange={(e) => up({ rotate: Number(e.target.value) })}>
          <option value={0}>Every visit</option>
          <option value={10}>Every 10 minutes</option>
          <option value={30}>Every 30 minutes</option>
          <option value={60}>Every hour</option>
          <option value={1440}>Every day</option>
        </select>
      </Row>
      <Row label="Only my quotes" hint={q.custom.length ? undefined : 'Add a quote below first'}>
        <Toggle on={q.onlyCustom} onChange={(v) => up({ onlyCustom: v })} />
      </Row>
      <form className="inline-form" onSubmit={(e) => { e.preventDefault(); if (text.trim()) { up({ custom: [...q.custom, text.trim()] }); setText('') } }}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add your own quote" maxLength={140} />
        <button className="btn sm" type="submit">Add</button>
      </form>
      <ul className="quote-list">
        {q.custom.map((c, i) => (
          <li key={i}>
            <span>“{c}”</span>
            <button className="icon-btn ghost xs" onClick={() => up({ custom: q.custom.filter((_, j) => j !== i) })} aria-label="Remove"><Trash2 size={13} /></button>
          </li>
        ))}
        {!q.custom.length && <li className="muted small">{QUOTES.length} built-in quotes. Yours will show up here.</li>}
      </ul>
    </Section>
  )
}

/* --------------------------------------------------------------- music */

export function MusicSection() {
  const sp = useStore((s) => s.settings.spotify)
  const up = useStore((s) => s.updateSpotify)
  const [connected, setConnected] = useState(isConnected())
  useEffect(() => {
    const on = () => setConnected(isConnected())
    window.addEventListener('floe-spotify', on)
    return () => window.removeEventListener('floe-spotify', on)
  }, [])
  const copy = () => { void navigator.clipboard?.writeText(redirectUri()); toast('Redirect URI copied') }
  const onLocalhost = window.location.hostname === 'localhost'
  const clientId = clientIdFor(sp.clientId)

  return (
    <>
      <Section title="Spotify" sub="The player works for everyone right away. Connect your account to add your own playlists and play, pause and skip on your devices.">
        <div className={`sp-status ${connected ? 'ok' : ''}`}>
          <SpotifyGlyph size={22} />
          <div>
            <strong>{connected ? 'Connected' : 'Not connected'}</strong>
            <span className="muted small">
              {connected
                ? 'Your playlists show up in the Music panel.'
                : clientId
                  ? 'Click Connect, approve on Spotify, and you’ll land right back here.'
                  : 'Spotify login hasn’t been set up for this copy of floe yet (see below).'}
            </span>
          </div>
          {connected
            ? <button className="btn sm ghost" onClick={logout}>Disconnect</button>
            : <button className="btn sm spotify" disabled={!clientId} onClick={() => void login(clientId)}>Connect</button>}
        </div>
        {onLocalhost && <p className="warn small">Spotify rejects “localhost”. Open this app at <a href={`http://127.0.0.1:${window.location.port}/app`}>127.0.0.1:{window.location.port}</a> instead.</p>}

        {!BUILT_IN_CLIENT_ID && (
          <details className="dev-setup" open={!clientId}>
            <summary>One-time setup for the app owner</summary>
            <p className="muted small">
              Spotify needs every <b>app</b> to be registered once, not every user. Do this once and everyone using your floe just clicks Connect.
            </p>
            <ol className="steps">
              <li>Open the <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noreferrer">Spotify Developer Dashboard <ExternalLink size={12} /></a> and click <b>Create app</b>.</li>
              <li>Under <b>Redirect URIs</b>, add exactly:
                <button className="copy-chip" onClick={copy}><code>{redirectUri()}</code><Copy size={12} /></button>
              </li>
              <li>Tick <b>Web API</b> and save. Copy the app’s <b>Client ID</b>.</li>
              <li>Put it in <code>.env.local</code> as <code>VITE_SPOTIFY_CLIENT_ID=…</code> and restart the dev server. Or paste it below to try it right now.</li>
            </ol>
            <Row label="Client ID" hint="Only needed if it isn’t built in">
              <input className="mono-input" value={sp.clientId} onChange={(e) => up({ clientId: e.target.value.trim() })} placeholder="32-character Client ID" spellCheck={false} />
            </Row>
            <p className="muted small">
              New Spotify apps start in Development mode: your own account works, and you can let up to 25 other people in under <b>User Management</b> in the dashboard.
            </p>
          </details>
        )}
      </Section>
      <Section title="Player">
        <Row label="Compact player" hint="Smaller embed without the track list"><Toggle on={sp.compact} onChange={(v) => up({ compact: v })} /></Row>
      </Section>
    </>
  )
}

/* -------------------------------------------------------------- extras */

const KEYS: [string, string][] = [
  ['Space', 'Start / pause timer'], ['R', 'Reset timer'], ['N', 'Next session'], ['1 · 2 · 3', 'Ambient · Home · Focus'],
  ['T', 'Tasks'], ['M', 'Music'], ['J', 'Notes'], ['F', 'Fullscreen'], [',', 'Settings'], ['Esc', 'Close'],
]

export function ExtrasSection() {
  const s = useStore((st) => st.settings)
  const update = useStore((st) => st.update)
  return (
    <>
      <Section title="Extras">
        <Row label="Hide UI when idle" hint="In Ambient mode, controls fade out after a few seconds"><Toggle on={s.hideIdle} onChange={(v) => update({ hideIdle: v })} /></Row>
        <Row label="Show logo"><Toggle on={s.showLogo} onChange={(v) => update({ showLogo: v })} /></Row>
        <Row label="Logo text">
          <input value={s.logoText} onChange={(e) => update({ logoText: e.target.value.slice(0, 18) })} placeholder="floe" />
        </Row>
      </Section>
      <Section title="Keyboard shortcuts">
        <ul className="keys">
          {KEYS.map(([k, d]) => <li key={k}><kbd>{k}</kbd><span>{d}</span></li>)}
        </ul>
      </Section>
    </>
  )
}

/* ------------------------------------------------------------- account */

function ago(t: number) {
  const s = Math.round((Date.now() - t) / 1000)
  return s < 10 ? 'just now' : s < 60 ? `${s}s ago` : s < 3600 ? `${Math.floor(s / 60)}m ago` : `${Math.floor(s / 3600)}h ago`
}

function CloudAccount() {
  const { ready, user, profile, sync, lastSync } = useAccount()
  const [, tick] = useState(0)
  const [pw, setPw] = useState('')
  const [recovery, setRecovery] = useState(false)
  useEffect(() => {
    const id = window.setInterval(() => tick((n) => n + 1), 15_000)
    const onRecovery = () => setRecovery(true)
    window.addEventListener('floe-password-recovery', onRecovery)
    return () => { clearInterval(id); window.removeEventListener('floe-password-recovery', onRecovery) }
  }, [])

  if (!cloudEnabled) {
    return (
      <Section title="Account" sub="Accounts aren’t configured for this copy of floe, so everything stays in this browser." >
        <span />
      </Section>
    )
  }
  if (!ready) return <Section title="Account"><div className="sp-loading"><span /></div></Section>

  if (!user) {
    return (
      <Section title="Account" sub="Sign in to sync your tasks, notes, settings and stats across devices.">
        <div className="auth-card"><AuthForm /></div>
      </Section>
    )
  }

  const initial = (profile?.display_name || profile?.username || user.email || '?').slice(0, 1).toUpperCase()
  return (
    <Section title="Account">
      <div className="acct-card">
        <span className="acct-avatar">{initial}</span>
        <div className="acct-meta">
          <strong>{profile?.display_name ?? profile?.username ?? 'You'}</strong>
          <span className="muted small">@{profile?.username ?? '…'} · {user.email}</span>
        </div>
        {profile && profile.role !== 'user' && <span className={`role-badge ${profile.role}`}>{profile.role}</span>}
      </div>
      <Row label="Sync" hint={sync === 'error' ? 'Couldn’t reach the cloud. Will retry on your next change.' : lastSync ? `Last synced ${ago(lastSync)}` : 'Starting…'}>
        <span className={`sync-dot ${sync}`}>{sync === 'syncing' ? 'Syncing' : sync === 'synced' ? 'Up to date' : sync === 'error' ? 'Offline' : 'Off'}</span>
      </Row>
      {recovery && (
        <form className="inline-form" onSubmit={async (e) => {
          e.preventDefault()
          try { await updatePassword(pw); setPw(''); setRecovery(false); toast('Password updated') } catch (err) { toast((err as Error).message) }
        }}>
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="New password (8+ characters)" minLength={8} required />
          <button className="btn sm" type="submit">Set password</button>
        </form>
      )}
      <div className="row-inline wrap">
        {isStaff(profile) && <a className="btn sm" href="/admin"><Shield size={14} /> Admin panel</a>}
        <button className="btn sm ghost" onClick={() => setRecovery((v) => !v)}><KeyRound size={14} /> Change password</button>
        <button className="btn sm ghost" onClick={() => void signOut()}><LogOut size={14} /> Sign out</button>
      </div>
    </Section>
  )
}

export function AccountSection() {
  const name = useStore((s) => s.settings.name)
  const { update, importData, resetAll } = useStore.getState()
  const fileRef = useRef<HTMLInputElement>(null)

  const exportData = () => {
    const s = useStore.getState()
    const blob = new Blob([JSON.stringify({
      app: 'floe', exportedAt: new Date().toISOString(),
      settings: s.settings, tasks: s.tasks, notes: s.notes, sessions: s.sessions, tasksCompleted: s.tasksCompleted,
    }, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `floe-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }
  const doImport = async (f?: File) => {
    if (!f) return
    try { toast(importData(JSON.parse(await f.text())) ? 'Backup restored' : 'That file isn’t a floe backup') }
    catch { toast('Could not read that file') }
  }

  return (
    <>
      <CloudAccount />
      <Section title="Profile">
        <Row label="Your name" hint="Used in your greeting">
          <input value={name} onChange={(e) => update({ name: e.target.value.slice(0, 24) })} placeholder="What should we call you?" />
        </Row>
      </Section>
      <Section title="Your data">
        <div className="row-inline wrap">
          <button className="btn sm ghost" onClick={exportData}><Download size={14} /> Export backup</button>
          <button className="btn sm ghost" onClick={() => fileRef.current?.click()}><Upload size={14} /> Import backup</button>
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => { void doImport(e.target.files?.[0]); e.target.value = '' }} />
          <button className="btn sm danger" onClick={() => { if (confirm('Erase all tasks, notes, stats and settings?')) { resetAll(); toast('Everything reset') } }}>
            <Trash2 size={14} /> Reset everything
          </button>
        </div>
      </Section>
    </>
  )
}

/* --------------------------------------------------------------- about */

export function AboutSection() {
  const items = [
    ['Live scenes', '8 hand-built animated worlds: forest, rain, aurora, synthwave and more.'],
    ['Flip clock', 'A 3D split-flap clock for your Home screen.'],
    ['Spotify', 'Embedded player, plus your own playlists once you log in.'],
    ['Sound mixer', 'Rain, waves, fire, birds and noise, generated live.'],
    ['Stats', 'Focus calendar, trend chart and streaks. All free.'],
  ]
  return (
    <Section title="What’s new" sub="floe 1.0, a calm place to get things done.">
      <ul className="changelog">
        {items.map(([t, d], i) => (
          <li key={t} style={{ ['--d' as string]: `${i * 60}ms` }}><strong>{t}</strong><span className="muted">{d}</span></li>
        ))}
      </ul>
      <a className="btn sm ghost" href="/">View the landing page</a>
    </Section>
  )
}

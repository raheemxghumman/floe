import { useCallback, useEffect, useState } from 'react'
import { Coffee, EyeOff, Flame, Monitor, Radio, RefreshCw, Smartphone, Tablet, Timer } from 'lucide-react'
import { supabase, type Role } from '../lib/supabase'

/** One row of public.admin_presence(): who has floe open, where, and what their timer is doing. */
export interface PresenceRow {
  user_id: string; username: string | null; display_name: string | null; email: string | null; role: Role
  online: boolean; page: 'app' | 'admin'; view: 'home' | 'focus' | 'ambient' | null; settings_open: boolean; tab_hidden: boolean
  timer_kind: 'pomodoro' | 'countdown' | 'stopwatch' | null; timer_mode: 'focus' | 'short' | 'long' | null
  timer_running: boolean; timer_left_s: number | null; timer_at: string | null
  task_active: boolean; today_min: number; streak: number; device: string | null; browser: string | null
  online_since: string; last_seen: string; last_sign_in: string | null
}

const VIEW_LABEL = { home: 'Home', focus: 'Focus', ambient: 'Ambient' } as const
const MODE_LABEL = { focus: 'Focusing', short: 'Short break', long: 'Long break' } as const

const clock = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
const when = (iso: string) => {
  const d = new Date(iso), today = new Date()
  const sameDay = d.toDateString() === today.toDateString()
  return sameDay ? `today ${clock(iso)}` : d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}
const span = (ms: number) => {
  const m = Math.max(0, Math.floor(ms / 60_000))
  return m < 1 ? 'under a minute' : m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${m % 60}m`
}
const ago = (iso: string, now: number) => {
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000))
  return s < 60 ? `${s}s ago` : s < 3600 ? `${Math.floor(s / 60)}m ago` : s < 86400 ? `${Math.floor(s / 3600)}h ago` : `${Math.floor(s / 86400)}d ago`
}
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

function screenOf(r: PresenceRow) {
  if (r.page === 'admin') return 'Admin panel'
  const v = r.view ? VIEW_LABEL[r.view] : 'App'
  return r.settings_open ? `${v} · Settings open` : v
}

/** Timer state, ticking locally between heartbeats. */
function timerOf(r: PresenceRow, now: number) {
  if (r.page === 'admin' || r.timer_left_s == null || !r.timer_mode) return { text: '—', live: false }
  const drift = r.timer_running && r.timer_at ? (now - Date.parse(r.timer_at)) / 1000 : 0
  if (r.timer_kind === 'stopwatch') {
    const t = r.timer_left_s + drift
    return { text: r.timer_running ? `Stopwatch · ${mmss(t)}` : `Stopwatch paused · ${mmss(t)}`, live: r.timer_running }
  }
  const left = Math.max(0, r.timer_left_s - drift)
  const label = MODE_LABEL[r.timer_mode]
  return r.timer_running ? { text: `${label} · ${mmss(left)} left`, live: true } : { text: `${label} · paused at ${mmss(left)}`, live: false }
}

function DeviceIcon({ d }: { d: string | null }) {
  const I = d?.startsWith('Phone') ? Smartphone : d?.startsWith('Tablet') ? Tablet : Monitor
  return <I size={14} />
}

function Who({ r }: { r: PresenceRow }) {
  const label = r.display_name || r.username || r.email || '?'
  const hue = [...r.user_id].reduce((a, c) => a + c.charCodeAt(0), 0) % 360
  return (
    <span className="adm-user">
      <span className="adm-avatar live-avatar" style={{ background: `linear-gradient(135deg, hsl(${hue} 70% 55%), hsl(${(hue + 40) % 360} 70% 40%))` }}>
        {label.slice(0, 1).toUpperCase()}
        {r.online && <i className={`live-dot ${r.tab_hidden ? 'away' : ''}`} />}
      </span>
      <span><strong>{label}</strong><span className="muted small">@{r.username ?? '—'}{r.role !== 'user' ? ` · ${r.role}` : ''}</span></span>
    </span>
  )
}

export function LivePage({ onCount }: { onCount: (n: number) => void }) {
  const [rows, setRows] = useState<PresenceRow[] | null>(null)
  const [error, setError] = useState('')
  const [now, setNow] = useState(Date.now())
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    const { data, error } = await supabase.rpc('admin_presence', { hours: 24 })
    setLoading(false)
    if (error) { setError(error.message); return }
    setError('')
    const list = (data ?? []) as PresenceRow[]
    setRows(list)
    onCount(list.filter((r) => r.online).length)
  }, [onCount])

  useEffect(() => {
    void load()
    const poll = window.setInterval(() => { if (!document.hidden) void load() }, 10_000)
    const tick = window.setInterval(() => setNow(Date.now()), 1000)
    return () => { clearInterval(poll); clearInterval(tick) }
  }, [load])

  if (error) return <div className="adm-card"><p className="muted">Couldn’t load live activity: {error}</p></div>
  if (!rows) return <div className="adm-card"><div className="sp-loading"><span /><span /></div></div>

  const online = rows.filter((r) => r.online)
  const recent = rows.filter((r) => !r.online)
  const focusing = online.filter((r) => r.timer_running && r.timer_mode === 'focus').length
  const onBreak = online.filter((r) => r.timer_running && r.timer_mode !== 'focus').length
  const phones = online.filter((r) => r.device?.startsWith('Phone')).length

  return (
    <>
      <div className="adm-grid live-stats">
        <div className="adm-stat tone-green"><div className="adm-stat-head"><span>Online now</span><Radio size={16} /></div><div className="adm-stat-val">{online.length}</div><div className="adm-stat-sub">updates every 10 seconds</div></div>
        <div className="adm-stat tone-violet"><div className="adm-stat-head"><span>Focusing now</span><Timer size={16} /></div><div className="adm-stat-val">{focusing}</div><div className="adm-stat-sub">timer running</div></div>
        <div className="adm-stat tone-teal"><div className="adm-stat-head"><span>On a break</span><Coffee size={16} /></div><div className="adm-stat-val">{onBreak}</div><div className="adm-stat-sub">short or long break</div></div>
        <div className="adm-stat tone-blue"><div className="adm-stat-head"><span>On a phone</span><Smartphone size={16} /></div><div className="adm-stat-val">{phones}</div><div className="adm-stat-sub">{online.length - phones} on desktop or tablet</div></div>
      </div>

      <div className="adm-card live-card">
        <div className="live-head">
          <h3><span className="live-pulse" /> Online now <em>{online.length}</em></h3>
          <button className={`icon-btn glass sm ${loading ? 'spinning' : ''}`} onClick={() => void load()} aria-label="Refresh"><RefreshCw size={14} /></button>
        </div>
        {online.length === 0 ? <p className="muted live-empty">Nobody has floe open right now.</p> : (
          <div className="adm-table-wrap">
            <table className="adm-table live-table">
              <thead><tr><th>User</th><th>Screen</th><th>Timer</th><th>Online since</th><th className="r">Focus today</th><th>Device</th><th>Last signed in</th><th>Activity</th></tr></thead>
              <tbody>
                {online.map((r) => {
                  const t = timerOf(r, now)
                  return (
                    <tr key={r.user_id}>
                      <td><Who r={r} /></td>
                      <td>
                        <span className={`screen-chip v-${r.page === 'admin' ? 'admin' : r.view ?? 'app'}`}>{screenOf(r)}</span>
                        {r.tab_hidden && <span className="muted small away-note"><EyeOff size={12} /> tab in background</span>}
                      </td>
                      <td><span className={`timer-chip ${t.live ? 'on' : ''} m-${r.timer_mode ?? 'none'}`}>{t.text}</span>{r.task_active && <span className="muted small"> · on a task</span>}</td>
                      <td><strong>{clock(r.online_since)}</strong><span className="muted small block">for {span(now - Date.parse(r.online_since))}</span></td>
                      <td className="r"><strong>{r.today_min} min</strong>{r.streak > 0 && <span className="muted small block"><Flame size={11} /> {r.streak}-day streak</span>}</td>
                      <td><span className="dev"><DeviceIcon d={r.device} /> {r.device ?? '—'}</span><span className="muted small block">{r.browser}</span></td>
                      <td className="small">{r.last_sign_in ? when(r.last_sign_in) : '—'}</td>
                      <td className="muted small">{ago(r.last_seen, now)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="adm-card live-card">
        <div className="live-head"><h3>Recently online <em>{recent.length}</em></h3><span className="muted small">last 24 hours</span></div>
        {recent.length === 0 ? <p className="muted live-empty">No one else in the last 24 hours.</p> : (
          <div className="adm-table-wrap">
            <table className="adm-table live-table">
              <thead><tr><th>User</th><th>Last seen</th><th>Visit</th><th>Last screen</th><th className="r">Focus that day</th><th>Device</th></tr></thead>
              <tbody>
                {recent.map((r) => (
                  <tr key={r.user_id} className="dim-soft">
                    <td><Who r={r} /></td>
                    <td><strong>{ago(r.last_seen, now)}</strong><span className="muted small block">{when(r.last_seen)}</span></td>
                    <td className="small">{clock(r.online_since)} – {clock(r.last_seen)}<span className="muted small block">{span(Date.parse(r.last_seen) - Date.parse(r.online_since))}</span></td>
                    <td><span className="screen-chip">{screenOf(r)}</span></td>
                    <td className="r">{r.today_min} min</td>
                    <td><span className="dev"><DeviceIcon d={r.device} /> {r.device ?? '—'}</span><span className="muted small block">{r.browser}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="muted small live-note">Shows which screen people are on, their timer and device. Task names, notes and music are never shared.</p>
    </>
  )
}

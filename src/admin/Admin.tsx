import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Activity, ArrowLeft, Ban, Check, CheckCircle2, ChevronRight, Clock, Copy, KeyRound, LayoutDashboard, ListChecks, LogOut,
  MoreHorizontal, RefreshCw, Search, Shield, ShieldCheck, Timer, Trash2, UserPlus, Users, Wand2, X,
} from 'lucide-react'
import '../styles/app.css'
import './admin.css'
import { initAccount, isStaff, signOut, useAccount } from '../lib/account'
import { callFn, cloudEnabled, supabase, type Role } from '../lib/supabase'
import { AuthForm } from '../components/AuthForm'
import { Toasts } from '../components/chrome'
import { toast } from '../hooks'
import { BarChart, LineChart, type Point } from './charts'

// the admin page must never merge its browser's local floe data into the admin's cloud copy
initAccount.syncOnSignIn = false
initAccount()

/* ------------------------------------------------------------ types */

interface Overview {
  total_users: number; new_users_7d: number; active_users_7d: number; active_today: number; suspended: number
  roles: Partial<Record<Role, number>> | null
  focus_minutes: number; break_minutes: number; focus_sessions: number; sessions_today: number; tasks_completed: number
  daily: { day: string; signups: number; sessions: number; minutes: number; active: number }[]
  hours: { hour: number; sessions: number }[]
}
interface AdminUser {
  id: string; email: string; username: string | null; display_name: string | null; role: Role; status: 'active' | 'suspended'
  created_at: string; last_seen: string; focus_minutes: number; sessions: number; minutes_7d: number; tasks_completed: number
}

/* ------------------------------------------------------------ utils */

const hrs = (m: number) => (m >= 60 ? `${(m / 60).toFixed(m >= 600 ? 0 : 1)}h` : `${Math.round(m)}m`)
const num = (n: number) => new Intl.NumberFormat().format(Math.round(n))
const dayLabel = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
function rel(iso: string) {
  const s = Math.round((Date.now() - Date.parse(iso)) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`
  return new Date(iso).toLocaleDateString()
}
function genPassword() {
  const words = ['calm', 'river', 'maple', 'cloud', 'ember', 'tide', 'fern', 'lumen', 'cedar', 'drift', 'aurora', 'pebble']
  const r = crypto.getRandomValues(new Uint32Array(3))
  return `${words[r[0] % words.length]}-${words[r[1] % words.length]}-${1000 + (r[2] % 9000)}`
}
const siteLink = () => `${window.location.origin}/app`
function credentialsText(c: { email: string; username: string; password: string }) {
  return `Your floe account\n\nSite: ${siteLink()}\nUsername: ${c.username}\nEmail: ${c.email}\nPassword: ${c.password}\n\nSign in with your username or email. You can change your password in Settings → Account.`
}
async function copy(text: string, what = 'Copied') {
  try { await navigator.clipboard.writeText(text); toast(what) } catch { toast('Couldn’t copy, select and copy manually') }
}

/* ------------------------------------------------------------ bits */

function Avatar({ u }: { u: Pick<AdminUser, 'display_name' | 'username' | 'email' | 'id'> }) {
  const label = u.display_name || u.username || u.email || '?'
  const hue = [...u.id].reduce((a, c) => a + c.charCodeAt(0), 0) % 360
  return <span className="adm-avatar" style={{ background: `linear-gradient(135deg, hsl(${hue} 70% 55%), hsl(${(hue + 40) % 360} 70% 40%))` }}>{label.slice(0, 1).toUpperCase()}</span>
}
const RoleBadge = ({ role }: { role: Role }) => <span className={`role-badge ${role}`}>{role}</span>
const StatusBadge = ({ s }: { s: AdminUser['status'] }) => <span className={`status-badge ${s}`}>{s === 'active' ? 'Active' : 'Suspended'}</span>

function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])
  return (
    <div className="adm-modal-root" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className={`adm-modal ${wide ? 'wide' : ''}`} role="dialog" aria-label={title}>
        <header><h3>{title}</h3><button className="icon-btn ghost xs" onClick={onClose} aria-label="Close"><X size={16} /></button></header>
        {children}
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, sub, tone }: { icon: typeof Users; label: string; value: string; sub?: string; tone: string }) {
  return (
    <div className={`adm-stat tone-${tone}`}>
      <div className="adm-stat-head"><span>{label}</span><Icon size={16} /></div>
      <div className="adm-stat-val">{value}</div>
      {sub && <div className="adm-stat-sub">{sub}</div>}
    </div>
  )
}

function Credentials({ c }: { c: { email: string; username: string; password: string } }) {
  const rows: [string, string][] = [['Site', siteLink()], ['Username', c.username], ['Email', c.email], ['Password', c.password]]
  return (
    <div className="cred">
      {rows.map(([k, v]) => (
        <div key={k} className="cred-row">
          <span className="cred-k">{k}</span>
          <code>{v}</code>
          <button className="icon-btn ghost xs" onClick={() => void copy(v, `${k} copied`)} aria-label={`Copy ${k}`}><Copy size={13} /></button>
        </div>
      ))}
      <button className="btn cred-all" onClick={() => void copy(credentialsText(c), 'Credentials and link copied')}>
        <Copy size={15} /> Copy credentials + link
      </button>
    </div>
  )
}

/* ------------------------------------------------------- create user */

function CreateUser({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ email: '', username: '', displayName: '', password: genPassword(), role: 'user' as Role })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [done, setDone] = useState<{ email: string; username: string; password: string } | null>(null)
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value })

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr('')
    try {
      await callFn('admin', { action: 'create', ...form })
      setDone({ email: form.email.trim().toLowerCase(), username: form.username.trim(), password: form.password })
      onCreated()
    } catch (x) { setErr((x as Error).message) } finally { setBusy(false) }
  }

  return (
    <Modal title={done ? 'Account created' : 'Create a user'} onClose={onClose}>
      {done ? (
        <div className="adm-modal-body">
          <p className="adm-success"><CheckCircle2 size={18} /> {done.username} can sign in right away. No email confirmation needed.</p>
          <Credentials c={done} />
          <div className="adm-modal-foot">
            <button className="btn ghost" onClick={() => { setDone(null); setForm({ email: '', username: '', displayName: '', password: genPassword(), role: 'user' }) }}>Create another</button>
            <button className="btn" onClick={onClose}>Done</button>
          </div>
        </div>
      ) : (
        <form className="adm-modal-body adm-form" onSubmit={submit}>
          <label className="field"><span>Email</span><input type="email" value={form.email} onChange={set('email')} required autoFocus /></label>
          <div className="adm-form-row">
            <label className="field"><span>Username</span><input value={form.username} onChange={set('username')} required pattern="[a-zA-Z0-9_]{3,20}" title="3–20 letters, numbers or _" /></label>
            <label className="field"><span>Display name <em className="muted">optional</em></span><input value={form.displayName} onChange={set('displayName')} /></label>
          </div>
          <label className="field">
            <span>Password</span>
            <span className="pw">
              <input value={form.password} onChange={set('password')} minLength={8} required />
              <button type="button" className="icon-btn ghost xs" onClick={() => setForm({ ...form, password: genPassword() })} title="Generate" aria-label="Generate password"><Wand2 size={14} /></button>
            </span>
          </label>
          <label className="field"><span>Role</span>
            <select value={form.role} onChange={set('role')}>
              <option value="user">User</option><option value="moderator">Moderator</option><option value="admin">Admin</option>
            </select>
          </label>
          {err && <p className="auth-msg bad">{err}</p>}
          <div className="adm-modal-foot">
            <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
            <button className="btn" disabled={busy}>{busy ? 'Creating…' : <><UserPlus size={15} /> Create account</>}</button>
          </div>
        </form>
      )}
    </Modal>
  )
}

/* ------------------------------------------------------- user detail */

function UserDetail({ u, me, onClose, onChanged, onAction }: {
  u: AdminUser; me: { id: string; role: Role }; onClose: () => void; onChanged: () => void
  onAction: (a: 'suspend' | 'unsuspend' | 'delete' | 'reset', u: AdminUser) => void
}) {
  const [daily, setDaily] = useState<Point[] | null>(null)
  useEffect(() => {
    void supabase!.rpc('admin_user_daily', { target: u.id, days: 30 }).then(({ data }) => {
      setDaily(((data ?? []) as { day: string; minutes: number }[]).map((d) => ({ label: dayLabel(d.day), value: Number(d.minutes) })))
    })
  }, [u.id])
  const isAdmin = me.role === 'admin'
  const self = u.id === me.id
  const setRole = async (role: Role) => {
    try { await callFn('admin', { action: 'set_role', userId: u.id, role }); toast(`${u.username ?? u.email} is now ${role}`); onChanged() }
    catch (e) { toast((e as Error).message) }
  }
  return (
    <aside className="adm-detail">
      <header>
        <button className="icon-btn ghost xs" onClick={onClose} aria-label="Close"><X size={16} /></button>
      </header>
      <div className="adm-detail-id">
        <Avatar u={u} />
        <div>
          <h3>{u.display_name || u.username}</h3>
          <span className="muted">@{u.username ?? '—'} · {u.email}</span>
          <div className="row-inline"><RoleBadge role={u.role} /><StatusBadge s={u.status} /></div>
        </div>
      </div>
      <div className="adm-mini-stats">
        <div><span>Focus total</span><strong>{hrs(Number(u.focus_minutes))}</strong></div>
        <div><span>Last 7 days</span><strong>{hrs(Number(u.minutes_7d))}</strong></div>
        <div><span>Sessions</span><strong>{num(u.sessions)}</strong></div>
        <div><span>Tasks done</span><strong>{num(u.tasks_completed)}</strong></div>
      </div>
      <div className="adm-card flat">
        <h4>Focus, last 30 days</h4>
        {daily ? <BarChart data={daily} fmt={hrs} /> : <div className="sp-loading"><span /></div>}
      </div>
      <dl className="adm-dl">
        <dt>Joined</dt><dd>{new Date(u.created_at).toLocaleString()}</dd>
        <dt>Last seen</dt><dd>{rel(u.last_seen)}</dd>
        <dt>User ID</dt><dd><code>{u.id}</code></dd>
      </dl>
      {!self && (
        <div className="adm-detail-actions">
          {isAdmin && (
            <label className="field"><span>Role</span>
              <select value={u.role} onChange={(e) => void setRole(e.target.value as Role)}>
                <option value="user">User</option><option value="moderator">Moderator</option><option value="admin">Admin</option>
              </select>
            </label>
          )}
          <div className="row-inline wrap">
            {(isAdmin || u.role === 'user') && (u.status === 'active'
              ? <button className="btn sm ghost" onClick={() => onAction('suspend', u)}><Ban size={14} /> Suspend</button>
              : <button className="btn sm ghost" onClick={() => onAction('unsuspend', u)}><Check size={14} /> Unsuspend</button>)}
            {isAdmin && <button className="btn sm ghost" onClick={() => onAction('reset', u)}><KeyRound size={14} /> Reset password</button>}
            {isAdmin && <button className="btn sm danger" onClick={() => onAction('delete', u)}><Trash2 size={14} /> Delete</button>}
          </div>
        </div>
      )}
      {self && <p className="muted small">This is you. Ask another admin to change your role.</p>}
    </aside>
  )
}

/* ------------------------------------------------------------ pages */

function OverviewPage({ ov, users, range, setRange }: { ov: Overview | null; users: AdminUser[]; range: number; setRange: (n: number) => void }) {
  if (!ov) return <div className="adm-grid">{Array.from({ length: 8 }, (_, i) => <div key={i} className="adm-stat skeleton" />)}</div>
  const daily = ov.daily
  const toPts = (k: 'minutes' | 'signups' | 'active' | 'sessions') => daily.map((d) => ({ label: dayLabel(d.day), value: Number(d[k]), full: new Date(d.day + 'T00:00:00').toDateString() }))
  const rangeMinutes = daily.reduce((a, d) => a + Number(d.minutes), 0)
  const staff = (ov.roles?.admin ?? 0) + (ov.roles?.moderator ?? 0)
  const top = [...users].sort((a, b) => Number(b.minutes_7d) - Number(a.minutes_7d)).filter((u) => Number(u.minutes_7d) > 0).slice(0, 5)
  return (
    <>
      <div className="adm-grid">
        <StatCard icon={Users} tone="violet" label="Total users" value={num(ov.total_users)} sub={`+${ov.new_users_7d} this week`} />
        <StatCard icon={Activity} tone="green" label="Active today" value={num(ov.active_today)} sub={`${ov.active_users_7d} this week`} />
        <StatCard icon={Timer} tone="blue" label="Focus time" value={hrs(Number(ov.focus_minutes))} sub={`${hrs(rangeMinutes)} in last ${range}d`} />
        <StatCard icon={Clock} tone="pink" label="Focus sessions" value={num(ov.focus_sessions)} sub={`${ov.sessions_today} today`} />
        <StatCard icon={ListChecks} tone="amber" label="Tasks completed" value={num(ov.tasks_completed)} />
        <StatCard icon={RefreshCw} tone="teal" label="Break time" value={hrs(Number(ov.break_minutes))} />
        <StatCard icon={ShieldCheck} tone="slate" label="Staff" value={num(staff)} sub={`${ov.roles?.admin ?? 0} admin · ${ov.roles?.moderator ?? 0} mod`} />
        <StatCard icon={Ban} tone="red" label="Suspended" value={num(ov.suspended)} />
      </div>

      <div className="adm-filters">
        <span className="muted small">Range</span>
        <div className="seg" style={{ ['--i' as string]: [7, 30, 90].indexOf(range), ['--n' as string]: 3 }}>
          <span className="seg-ind" />
          {[7, 30, 90].map((r) => <button key={r} className={r === range ? 'on' : ''} onClick={() => setRange(r)}>{r} days</button>)}
        </div>
      </div>

      <div className="adm-charts">
        <div className="adm-card"><h4>Focus time per day</h4><LineChart data={toPts('minutes')} fmt={hrs} /></div>
        <div className="adm-card"><h4>New sign-ups</h4><BarChart data={toPts('signups')} color="#34d399" /></div>
        <div className="adm-card"><h4>Active users per day</h4><LineChart data={toPts('active')} color="#60a5fa" /></div>
        <div className="adm-card"><h4>When people focus <em className="muted">(hour, UTC)</em></h4>
          <BarChart data={ov.hours.map((h) => ({ label: String(h.hour).padStart(2, '0'), value: Number(h.sessions), full: `${String(h.hour).padStart(2, '0')}:00 UTC` }))} color="#f472b6" />
        </div>
      </div>

      <div className="adm-charts">
        <div className="adm-card">
          <h4>Newest members</h4>
          <ul className="adm-list">
            {users.slice(0, 6).map((u) => (
              <li key={u.id}><Avatar u={u} /><span className="adm-list-main"><strong>{u.display_name || u.username}</strong><span className="muted small">@{u.username} · {rel(u.created_at)}</span></span><RoleBadge role={u.role} /></li>
            ))}
          </ul>
        </div>
        <div className="adm-card">
          <h4>Top focusers this week</h4>
          {top.length ? (
            <ul className="adm-list">
              {top.map((u, i) => (
                <li key={u.id}><span className="adm-rank">{i + 1}</span><Avatar u={u} /><span className="adm-list-main"><strong>{u.display_name || u.username}</strong><span className="muted small">{u.sessions} sessions total</span></span><strong>{hrs(Number(u.minutes_7d))}</strong></li>
              ))}
            </ul>
          ) : <p className="muted small adm-empty">No focus sessions this week yet.</p>}
        </div>
      </div>
    </>
  )
}

function UsersPage({ users, me, onOpen, onCreate, onAction, onRole }: {
  users: AdminUser[]; me: { id: string; role: Role }; onOpen: (u: AdminUser) => void; onCreate: () => void
  onAction: (a: 'suspend' | 'unsuspend' | 'delete' | 'reset', u: AdminUser) => void; onRole: (u: AdminUser, r: Role) => void
}) {
  const [q, setQ] = useState('')
  const [role, setRole] = useState<'all' | Role>('all')
  const [status, setStatus] = useState<'all' | AdminUser['status']>('all')
  const [menu, setMenu] = useState<string | null>(null)
  const isAdmin = me.role === 'admin'
  const shown = users.filter((u) =>
    (role === 'all' || u.role === role) && (status === 'all' || u.status === status) &&
    (!q || [u.email, u.username, u.display_name].some((v) => v?.toLowerCase().includes(q.toLowerCase()))))

  useEffect(() => {
    const close = () => setMenu(null)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [])

  return (
    <div className="adm-card table-card">
      <div className="adm-toolbar">
        <label className="adm-search"><Search size={15} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, username or email" /></label>
        <select value={role} onChange={(e) => setRole(e.target.value as typeof role)}>
          <option value="all">All roles</option><option value="admin">Admins</option><option value="moderator">Moderators</option><option value="user">Users</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
          <option value="all">Any status</option><option value="active">Active</option><option value="suspended">Suspended</option>
        </select>
        <span className="muted small adm-count">{shown.length} of {users.length}</span>
        {isAdmin && <button className="btn sm" onClick={onCreate}><UserPlus size={15} /> New user</button>}
      </div>
      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr><th>User</th><th>Role</th><th>Status</th><th className="r">Focus</th><th className="r">7 days</th><th className="r">Sessions</th><th className="r">Tasks</th><th>Joined</th><th>Last seen</th><th /></tr>
          </thead>
          <tbody>
            {shown.map((u) => {
              const self = u.id === me.id
              return (
                <tr key={u.id} onClick={() => onOpen(u)} className={u.status === 'suspended' ? 'dim' : ''}>
                  <td>
                    <span className="adm-user"><Avatar u={u} /><span><strong>{u.display_name || u.username}</strong><span className="muted small">@{u.username ?? '—'} · {u.email}</span></span></span>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    {isAdmin && !self
                      ? <select className={`role-select ${u.role}`} value={u.role} onChange={(e) => onRole(u, e.target.value as Role)}>
                        <option value="user">user</option><option value="moderator">moderator</option><option value="admin">admin</option>
                      </select>
                      : <RoleBadge role={u.role} />}
                  </td>
                  <td><StatusBadge s={u.status} /></td>
                  <td className="r">{hrs(Number(u.focus_minutes))}</td>
                  <td className="r">{hrs(Number(u.minutes_7d))}</td>
                  <td className="r">{num(u.sessions)}</td>
                  <td className="r">{num(u.tasks_completed)}</td>
                  <td>{new Date(u.created_at).toLocaleDateString()}</td>
                  <td>{rel(u.last_seen)}</td>
                  <td className="r" onClick={(e) => e.stopPropagation()}>
                    {!self && (isAdmin || u.role === 'user') && (
                      <span className="adm-menu-wrap">
                        <button className="icon-btn ghost xs" onClick={(e) => { e.stopPropagation(); setMenu(menu === u.id ? null : u.id) }} aria-label="Actions"><MoreHorizontal size={16} /></button>
                        {menu === u.id && (
                          <span className="adm-menu">
                            <button onClick={() => onOpen(u)}><ChevronRight size={14} /> View details</button>
                            {u.status === 'active'
                              ? <button onClick={() => onAction('suspend', u)}><Ban size={14} /> Suspend</button>
                              : <button onClick={() => onAction('unsuspend', u)}><Check size={14} /> Unsuspend</button>}
                            {isAdmin && <button onClick={() => onAction('reset', u)}><KeyRound size={14} /> Reset password</button>}
                            {isAdmin && <button className="danger" onClick={() => onAction('delete', u)}><Trash2 size={14} /> Delete</button>}
                          </span>
                        )}
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
            {!shown.length && <tr><td colSpan={10} className="adm-empty">No users match.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------ shell */

export default function Admin() {
  const { ready, user, profile } = useAccount()
  const [tab, setTab] = useState<'overview' | 'users'>('overview')
  const [range, setRange] = useState(30)
  const [ov, setOv] = useState<Overview | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [open, setOpen] = useState<AdminUser | null>(null)
  const [creating, setCreating] = useState(false)
  const [confirm, setConfirm] = useState<{ a: 'suspend' | 'unsuspend' | 'delete' | 'reset'; u: AdminUser } | null>(null)
  const [typed, setTyped] = useState('')
  const [resetPw, setResetPw] = useState<{ u: AdminUser; password: string; done: boolean } | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => { document.title = 'floe · admin' }, [])
  const staff = isStaff(profile)

  const load = useCallback(async () => {
    if (!supabase || !staff) return
    setLoading(true)
    const [o, us] = await Promise.all([
      supabase.rpc('admin_overview', { days: range }),
      supabase.rpc('admin_users', { search: '', lim: 500, off: 0 }),
    ])
    if (o.error || us.error) toast((o.error ?? us.error)!.message)
    setOv(o.data as Overview)
    const list = (us.data ?? []) as AdminUser[]
    setUsers(list)
    setOpen((cur) => (cur ? list.find((x) => x.id === cur.id) ?? null : null))
    setLoading(false)
  }, [range, staff])
  useEffect(() => { void load() }, [load])

  const me = useMemo(() => ({ id: user?.id ?? '', role: (profile?.role ?? 'user') as Role }), [user, profile])

  const changeRole = async (u: AdminUser, role: Role) => {
    try { await callFn('admin', { action: 'set_role', userId: u.id, role }); toast(`${u.username ?? u.email} is now ${role}`); void load() }
    catch (e) { toast((e as Error).message) }
  }
  const onAction = (a: 'suspend' | 'unsuspend' | 'delete' | 'reset', u: AdminUser) => {
    if (a === 'reset') { setResetPw({ u, password: genPassword(), done: false }); return }
    setTyped(''); setConfirm({ a, u })
  }
  const runConfirm = async () => {
    if (!confirm) return
    const { a, u } = confirm
    try {
      await callFn('admin', { action: a, userId: u.id })
      toast(a === 'delete' ? `Deleted ${u.username ?? u.email}` : a === 'suspend' ? `Suspended ${u.username ?? u.email}` : `Restored ${u.username ?? u.email}`)
      if (a === 'delete') setOpen(null)
      setConfirm(null); void load()
    } catch (e) { toast((e as Error).message) }
  }
  const runReset = async () => {
    if (!resetPw) return
    try { await callFn('admin', { action: 'reset_password', userId: resetPw.u.id, password: resetPw.password }); setResetPw({ ...resetPw, done: true }) }
    catch (e) { toast((e as Error).message) }
  }

  /* gates */
  if (!cloudEnabled) return <Gate><p>Accounts aren’t configured for this build.</p></Gate>
  if (!ready) return <Gate><div className="sp-loading"><span /><span /></div></Gate>
  if (!user) return <Gate><p className="muted">Sign in with an admin or moderator account.</p><AuthForm allowSignup={false} /></Gate>
  if (!profile) return <Gate><div className="sp-loading"><span /></div></Gate>
  if (!staff) return (
    <Gate>
      <p>Your account (@{profile.username}) doesn’t have admin access.</p>
      <div className="row-inline"><a className="btn sm ghost" href="/app"><ArrowLeft size={14} /> Back to floe</a><button className="btn sm ghost" onClick={() => void signOut()}><LogOut size={14} /> Sign out</button></div>
    </Gate>
  )

  return (
    <div className="adm">
      <aside className="adm-side">
        <a href="/app" className="adm-logo">floe <span>admin</span></a>
        <nav>
          <button className={tab === 'overview' ? 'on' : ''} onClick={() => setTab('overview')}><LayoutDashboard size={17} /> Overview</button>
          <button className={tab === 'users' ? 'on' : ''} onClick={() => setTab('users')}><Users size={17} /> Users <em>{users.length}</em></button>
        </nav>
        {me.role === 'admin' && <button className="btn adm-new" onClick={() => setCreating(true)}><UserPlus size={15} /> New user</button>}
        <div className="adm-me">
          <Avatar u={{ id: user.id, display_name: profile.display_name, username: profile.username, email: profile.email ?? '' }} />
          <span><strong>{profile.display_name || profile.username}</strong><RoleBadge role={profile.role} /></span>
          <button className="icon-btn ghost xs" onClick={() => void signOut()} title="Sign out" aria-label="Sign out"><LogOut size={15} /></button>
        </div>
      </aside>

      <main className="adm-main">
        <header className="adm-head">
          <div>
            <h1>{tab === 'overview' ? 'Overview' : 'Users'}</h1>
            <p className="muted">{tab === 'overview' ? 'How people are using floe.' : 'Manage accounts, roles and access.'}</p>
          </div>
          <div className="row-inline">
            <button className={`icon-btn glass sm ${loading ? 'spinning' : ''}`} onClick={() => void load()} aria-label="Refresh" title="Refresh"><RefreshCw size={15} /></button>
            <a className="btn sm ghost" href="/app"><ArrowLeft size={14} /> Back to app</a>
          </div>
        </header>
        <div className="adm-page" key={tab}>
          {tab === 'overview'
            ? <OverviewPage ov={ov} users={users} range={range} setRange={setRange} />
            : <UsersPage users={users} me={me} onOpen={setOpen} onCreate={() => setCreating(true)} onAction={onAction} onRole={(u, r) => void changeRole(u, r)} />}
        </div>
      </main>

      {open && <div className="adm-scrim" onClick={() => setOpen(null)} />}
      {open && <UserDetail u={open} me={me} onClose={() => setOpen(null)} onChanged={() => void load()} onAction={onAction} />}
      {creating && <CreateUser onClose={() => setCreating(false)} onCreated={() => void load()} />}

      {confirm && (
        <Modal title={confirm.a === 'delete' ? 'Delete this account?' : confirm.a === 'suspend' ? 'Suspend this account?' : 'Restore this account?'} onClose={() => setConfirm(null)}>
          <div className="adm-modal-body">
            <p className="muted">
              {confirm.a === 'delete' && <>This permanently removes <b>@{confirm.u.username}</b> and all their tasks, notes and stats. This can’t be undone.</>}
              {confirm.a === 'suspend' && <><b>@{confirm.u.username}</b> will be signed out within the hour and won’t be able to sign in until restored.</>}
              {confirm.a === 'unsuspend' && <><b>@{confirm.u.username}</b> will be able to sign in again.</>}
            </p>
            {confirm.a === 'delete' && (
              <label className="field"><span>Type <b>{confirm.u.username ?? confirm.u.email}</b> to confirm</span><input value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus /></label>
            )}
            <div className="adm-modal-foot">
              <button className="btn ghost" onClick={() => setConfirm(null)}>Cancel</button>
              <button className={`btn ${confirm.a === 'unsuspend' ? '' : 'danger-solid'}`} disabled={confirm.a === 'delete' && typed !== (confirm.u.username ?? confirm.u.email)} onClick={() => void runConfirm()}>
                {confirm.a === 'delete' ? 'Delete forever' : confirm.a === 'suspend' ? 'Suspend' : 'Restore'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {resetPw && (
        <Modal title={resetPw.done ? 'Password reset' : `Reset password for @${resetPw.u.username}`} onClose={() => setResetPw(null)}>
          <div className="adm-modal-body">
            {resetPw.done ? (
              <>
                <p className="adm-success"><CheckCircle2 size={18} /> New password is active. Send it to them:</p>
                <Credentials c={{ email: resetPw.u.email, username: resetPw.u.username ?? '', password: resetPw.password }} />
                <div className="adm-modal-foot"><button className="btn" onClick={() => setResetPw(null)}>Done</button></div>
              </>
            ) : (
              <>
                <label className="field"><span>New password</span>
                  <span className="pw">
                    <input value={resetPw.password} onChange={(e) => setResetPw({ ...resetPw, password: e.target.value })} minLength={8} />
                    <button type="button" className="icon-btn ghost xs" onClick={() => setResetPw({ ...resetPw, password: genPassword() })} aria-label="Generate"><Wand2 size={14} /></button>
                  </span>
                </label>
                <div className="adm-modal-foot">
                  <button className="btn ghost" onClick={() => setResetPw(null)}>Cancel</button>
                  <button className="btn" disabled={resetPw.password.length < 8} onClick={() => void runReset()}><KeyRound size={14} /> Set password</button>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}
      <Toasts />
    </div>
  )
}

function Gate({ children }: { children: ReactNode }) {
  return (
    <div className="adm-gate">
      <div className="adm-gate-card">
        <a href="/app" className="adm-logo">floe <span>admin</span></a>
        <Shield size={28} className="adm-gate-icon" />
        {children}
      </div>
      <Toasts />
    </div>
  )
}

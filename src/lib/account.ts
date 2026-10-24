// Accounts + cloud sync. Local state stays the source of truth while you use the app;
// on sign-in we merge with the cloud copy, then push changes (debounced) as they happen.
import { create } from 'zustand'
import type { User } from '@supabase/supabase-js'
import { callFn, supabase, type Profile } from './supabase'
import { mergeSettings, useStore, type Note, type Session, type Settings, type Task } from '../store'
import { logout as spotifyLogout } from './spotify'

type SyncState = 'off' | 'syncing' | 'synced' | 'error'

interface AccountState {
  ready: boolean
  user: User | null
  profile: Profile | null
  sync: SyncState
  lastSync: number | null
}

export const useAccount = create<AccountState>(() => ({ ready: !supabase, user: null, profile: null, sync: 'off', lastSync: null }))

export const isStaff = (p: Profile | null) => !!p && p.status === 'active' && (p.role === 'admin' || p.role === 'moderator')

/* ------------------------------------------------------------- auth */

export async function signIn(identifier: string, password: string) {
  if (!supabase) throw new Error('Accounts aren’t configured.')
  const { session } = await callFn<{ session: { access_token: string; refresh_token: string } }>('login', { identifier, password })
  const { error } = await supabase.auth.setSession(session)
  if (error) throw new Error(error.message)
}

export async function usernameAvailable(name: string) {
  if (!supabase) return false
  const { data } = await supabase.rpc('username_available', { name })
  return data === true
}

/** Returns true when Supabase wants the user to confirm their email first. */
export async function signUp(email: string, username: string, password: string) {
  if (!supabase) throw new Error('Accounts aren’t configured.')
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) throw new Error('Username must be 3–20 letters, numbers or _.')
  if (!(await usernameAvailable(username))) throw new Error('That username is taken.')
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { data: { username, display_name: username }, emailRedirectTo: `${window.location.origin}/app` },
  })
  if (error) throw new Error(error.message)
  return !data.session
}

export async function sendReset(email: string) {
  if (!supabase) throw new Error('Accounts aren’t configured.')
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/app` })
  if (error) throw new Error(error.message)
}

export async function updatePassword(password: string) {
  if (!supabase) return
  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw new Error(error.message)
}

// which account the data in this browser belongs to, so a second person on a shared device starts clean
const OWNER_KEY = 'floe-data-owner'

function wipeLocal() {
  useStore.getState().resetAll()
  spotifyLogout()
  try { localStorage.removeItem(EDIT_KEY); localStorage.removeItem(OWNER_KEY) } catch { /* private mode */ }
}

export async function signOut() {
  const { user } = useAccount.getState()
  // flush anything still waiting in the debounce before the session goes away
  if (user && pushTimer) { clearTimeout(pushTimer); await push(user.id).catch(() => {}) }
  // local scope: signing out here must not end the same account's sessions on other devices
  await supabase?.auth.signOut({ scope: 'local' })
  wipeLocal()
}

export async function updateDisplayName(name: string) {
  const { user } = useAccount.getState()
  if (!supabase || !user) return
  await supabase.from('profiles').update({ display_name: name }).eq('id', user.id)
  useAccount.setState((s) => ({ profile: s.profile ? { ...s.profile, display_name: name } : s.profile }))
}

/* ------------------------------------------------------------- sync */

interface CloudData {
  settings?: Partial<Settings>
  tasks?: Task[]
  notes?: Note[]
  tasksCompleted?: number
  activeTaskId?: string | null
}

// when this device last changed settings; lets a newer local edit win over an older cloud copy
const EDIT_KEY = 'floe-local-edit'
const localEditAt = () => Number(localStorage.getItem(EDIT_KEY) ?? 0)

const sessionKey = (s: Session) => `${s.type}@${new Date(s.at).toISOString()}`

function snapshot(): CloudData {
  const s = useStore.getState()
  // the Spotify client ID override is device setup, not personal data
  const { spotify, ...settings } = s.settings
  return {
    settings: { ...settings, spotify: { ...spotify, clientId: '' } } as Settings,
    tasks: s.tasks, notes: s.notes, tasksCompleted: s.tasksCompleted, activeTaskId: s.activeTaskId,
  }
}

function mergeInto(remote: CloudData | null, remoteSessions: Session[], remoteAt: number) {
  const s = useStore.getState()
  const tasks = new Map<string, Task>()
  for (const t of remote?.tasks ?? []) tasks.set(t.id, t)
  for (const t of s.tasks) tasks.set(t.id, t) // this device wins on conflict
  const notes = new Map<string, Note>()
  for (const n of [...(remote?.notes ?? []), ...s.notes]) {
    const prev = notes.get(n.id)
    if (!prev || n.updatedAt >= prev.updatedAt) notes.set(n.id, n)
  }
  const sessions = new Map<string, Session>()
  for (const x of [...remoteSessions, ...s.sessions]) sessions.set(sessionKey(x), x)
  const rs = remote?.settings && remoteAt >= localEditAt() ? remote.settings : undefined
  useStore.setState({
    settings: rs ? (() => {
      const merged = mergeSettings(s.settings, rs)
      // never adopt a stale celebration marker from the cloud that would hide a level-up
      return { ...merged, spotify: { ...merged.spotify, clientId: s.settings.spotify.clientId }, pet: { ...merged.pet, seenLevel: Math.max(merged.pet.seenLevel, s.settings.pet.seenLevel) } }
    })() : s.settings,
    tasks: [...tasks.values()].sort((a, b) => a.createdAt - b.createdAt),
    notes: [...notes.values()].sort((a, b) => b.updatedAt - a.updatedAt),
    sessions: [...sessions.values()].sort((a, b) => a.at - b.at),
    tasksCompleted: Math.max(s.tasksCompleted, remote?.tasksCompleted ?? 0),
    activeTaskId: s.activeTaskId ?? remote?.activeTaskId ?? null,
  })
}

let unsub: (() => void) | null = null
let pushTimer = 0
let seenTimer = 0
const pushedSessions = new Set<string>()

async function push(userId: string) {
  if (!supabase) return
  useAccount.setState({ sync: 'syncing' })
  const s = useStore.getState()
  const fresh = s.sessions.filter((x) => !pushedSessions.has(sessionKey(x)))
  const [state, rows] = await Promise.all([
    supabase.from('user_state').upsert({ user_id: userId, data: snapshot(), updated_at: new Date().toISOString() }),
    fresh.length
      ? supabase.from('focus_sessions').upsert(
        fresh.map((x) => ({ user_id: userId, at: new Date(x.at).toISOString(), minutes: x.minutes, type: x.type })),
        { onConflict: 'user_id,at,type', ignoreDuplicates: true },
      )
      : Promise.resolve({ error: null }),
  ])
  if (state.error || rows.error) { useAccount.setState({ sync: 'error' }); return }
  fresh.forEach((x) => pushedSessions.add(sessionKey(x)))
  useAccount.setState({ sync: 'synced', lastSync: Date.now() })
}

async function startSync(user: User) {
  if (!supabase) return
  stopSync()
  useAccount.setState({ sync: 'syncing' })
  const [{ data: profile }, { data: state }, { data: rows }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('user_state').select('data, updated_at').eq('user_id', user.id).maybeSingle(),
    supabase.from('focus_sessions').select('at, minutes, type').eq('user_id', user.id).order('at').limit(10000),
  ])
  const remoteSessions: Session[] = (rows ?? []).map((r) => ({ at: Date.parse(r.at), minutes: Number(r.minutes), type: r.type }))
  remoteSessions.forEach((x) => pushedSessions.add(sessionKey(x)))
  mergeInto((state?.data as CloudData | undefined) ?? null, remoteSessions, state?.updated_at ? Date.parse(state.updated_at) : 0)

  const p = profile as Profile | null
  useAccount.setState({ profile: p })
  if (p?.display_name && !useStore.getState().settings.name) useStore.getState().update({ name: p.display_name })
  await push(user.id)

  unsub = useStore.subscribe((cur, prev) => {
    if (cur.settings !== prev.settings) { try { localStorage.setItem(EDIT_KEY, String(Date.now())) } catch { /* private mode */ } }
    if (cur.settings === prev.settings && cur.tasks === prev.tasks && cur.notes === prev.notes && cur.sessions === prev.sessions && cur.activeTaskId === prev.activeTaskId) return
    clearTimeout(pushTimer)
    pushTimer = window.setTimeout(() => void push(user.id), 2500)
  })
  // also re-reads the profile so XP granted by an admin shows up without signing in again
  const seen = () => void supabase!.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', user.id).then(() => loadProfile(user.id))
  seen()
  seenTimer = window.setInterval(seen, 5 * 60_000)
}

function stopSync() {
  unsub?.(); unsub = null
  clearTimeout(pushTimer); clearInterval(seenTimer)
  pushedSessions.clear()
}

/** Call once at boot (app and admin). */
export function initAccount() {
  if (!supabase || initAccount.done) return
  initAccount.done = true
  supabase.auth.onAuthStateChange((event, session) => {
    const user = session?.user ?? null
    const prevId = useAccount.getState().user?.id
    useAccount.setState({ user, ready: true })
    if (!user) { stopSync(); useAccount.setState({ profile: null, sync: 'off', lastSync: null }); return }
    if (event === 'PASSWORD_RECOVERY') window.dispatchEvent(new Event('floe-password-recovery'))
    // a stored session can outlive its server-side session (revoked, signed out elsewhere, user deleted);
    // check once at startup and drop it so the sign-in screen shows instead of failing later
    if (event === 'INITIAL_SESSION') {
      window.setTimeout(() => void supabase!.auth.getUser().then(({ error }) => {
        if (error) void supabase!.auth.signOut({ scope: 'local' })
      }), 0)
    }
    // defer: Supabase forbids awaiting its own calls inside this callback
    if (user.id !== prevId && initAccount.syncOnSignIn) {
      const owner = localStorage.getItem(OWNER_KEY)
      if (owner && owner !== user.id) wipeLocal()
      try { localStorage.setItem(OWNER_KEY, user.id) } catch { /* private mode */ }
      window.setTimeout(() => void startSync(user), 0)
    }
    else if (user.id !== prevId) window.setTimeout(() => void loadProfile(user.id), 0)
  })
}
initAccount.done = false
/** The admin page shows profiles but must not merge its local data into the cloud. */
initAccount.syncOnSignIn = true

async function loadProfile(id: string) {
  const { data } = await supabase!.from('profiles').select('*').eq('id', id).single()
  useAccount.setState({ profile: data as Profile | null })
}

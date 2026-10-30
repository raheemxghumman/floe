import { useEffect } from 'react'
import { supabase } from './supabase'
import { useAccount } from './account'
import { elapsedOf, useStore } from '../store'
import { streakFrom } from './levels'

/**
 * Live presence for the admin "Live" page: a heartbeat every 30 s (and right away when the screen
 * or timer changes) through the presence_ping RPC. Only coarse state is sent: which screen,
 * timer status, today's focus minutes and the device type. No task text, notes or theme content.
 */

const BEAT_MS = 30_000

function device() {
  const ua = navigator.userAgent
  const kind = /iPad|Tablet/i.test(ua) ? 'Tablet' : /Mobi|Android|iPhone/i.test(ua) ? 'Phone' : 'Desktop'
  const os = /Windows/i.test(ua) ? 'Windows' : /Android/i.test(ua) ? 'Android' : /iPhone|iPad|iOS/i.test(ua) ? 'iOS' : /Mac OS/i.test(ua) ? 'macOS' : /Linux/i.test(ua) ? 'Linux' : ''
  const browser = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /SamsungBrowser/.test(ua) ? 'Samsung' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Other'
  return { device: os ? `${kind} · ${os}` : kind, browser }
}

function snapshot(page: 'app' | 'admin') {
  const s = useStore.getState()
  const now = Date.now()
  const t = s.settings.timer
  // stopwatch reports time elapsed; the other kinds report time left
  const left = t.kind === 'stopwatch' ? elapsedOf(s.timer, now) : (s.timer.running ? s.timer.endAt - now : s.timer.remaining)
  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0)
  const todayMin = s.sessions.filter((x) => x.type === 'focus' && x.at >= startOfDay.getTime()).reduce((m, x) => m + x.minutes, 0)
  return {
    page,
    view: page === 'app' ? s.view : null,
    settings_open: page === 'app' && s.settingsOpen,
    tab_hidden: document.hidden,
    timer_kind: t.kind,
    timer_mode: s.timer.mode,
    timer_running: s.timer.running,
    timer_left_s: Math.round(Math.max(0, left) / 1000),
    task_active: !!s.activeTaskId,
    today_min: Math.round(todayMin),
    streak: streakFrom(s.sessions),
    ...device(),
  }
}

/** Mark this user offline when the tab closes; keepalive lets the request outlive the page. */
async function leaveBeacon() {
  const { data } = await supabase!.auth.getSession()
  const token = data.session?.access_token
  if (!token) return
  const url = import.meta.env.VITE_SUPABASE_URL as string
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string
  void fetch(`${url}/rest/v1/rpc/presence_leave`, {
    method: 'POST', keepalive: true, body: '{}',
    headers: { apikey: key, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  }).catch(() => {})
}

export function usePresence(page: 'app' | 'admin') {
  const userId = useAccount((s) => s.user?.id)
  useEffect(() => {
    if (!supabase || !userId) return
    let last = ''
    let pending = 0
    const ping = (force = false) => {
      const snap = snapshot(page)
      // timer_left_s changes every second; only count it for the periodic beat, not for "something changed"
      const key = JSON.stringify({ ...snap, timer_left_s: 0 })
      if (!force && key === last) return
      last = key
      void supabase!.rpc('presence_ping', { info: snap }).then(({ error }) => { if (error) last = '' })
    }
    ping(true)
    const beat = window.setInterval(() => ping(true), BEAT_MS)
    // screen / timer / settings changes go out within a second
    const unsub = useStore.subscribe((cur, prev) => {
      if (cur.view === prev.view && cur.settingsOpen === prev.settingsOpen && cur.timer === prev.timer && cur.activeTaskId === prev.activeTaskId) return
      clearTimeout(pending); pending = window.setTimeout(() => ping(), 800)
    })
    const vis = () => ping(true)
    const hide = () => void leaveBeacon()
    document.addEventListener('visibilitychange', vis)
    window.addEventListener('pagehide', hide)
    return () => {
      clearInterval(beat); clearTimeout(pending); unsub()
      document.removeEventListener('visibilitychange', vis)
      window.removeEventListener('pagehide', hide)
    }
  }, [page, userId])
}

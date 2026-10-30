import { useEffect, useState } from 'react'
import { create } from 'zustand'
import { elapsedOf, fmtTimer, MODE_LABEL, remainingOf, useNow, useStore } from './store'
import { playAlarm } from './lib/audio'

/* ------------------------------------------------------------- toasts */

interface Toast { id: number; text: string }
export const useToasts = create<{ list: Toast[] }>(() => ({ list: [] }))
export function toast(text: string) {
  const id = Date.now() + Math.random()
  useToasts.setState((s) => ({ list: [...s.list, { id, text }] }))
  window.setTimeout(() => useToasts.setState((s) => ({ list: s.list.filter((t) => t.id !== id) })), 3600)
}

/* ------------------------------------------------------- timer engine */

const COMPLETE_MSG = {
  focus: ['Focus session complete', 'Nice work. Take a breather.'],
  short: ['Break’s over', 'Back to it, you’ve got this.'],
  long: ['Long break finished', 'Fresh start. Let’s go.'],
} as const

export function useTimerEngine() {
  useEffect(() => {
    const baseTitle = document.title
    const id = window.setInterval(() => {
      const now = Date.now()
      useNow.setState({ now })
      const { timer, settings, complete } = useStore.getState()
      if (timer.running && settings.timer.kind !== 'stopwatch' && now >= timer.endAt) {
        const finished = complete()
        playAlarm(settings.timer.sound, settings.timer.volume)
        const [title, body] = COMPLETE_MSG[finished]
        toast(finished === 'focus' ? `${title} · +${Math.round(settings.timer.focus)} XP` : title)
        if (settings.timer.notify && 'Notification' in window && Notification.permission === 'granted') {
          try { new Notification(title, { body, icon: '/favicon.svg', silent: true }) } catch { /* unsupported */ }
        }
      }
      const s = useStore.getState()
      document.title = s.settings.timer.tabTitle && s.timer.running
        ? `${fmtTimer(s.settings.timer.kind === 'stopwatch' ? elapsedOf(s.timer, now) : remainingOf(s.timer, now))} · ${s.settings.timer.kind === 'stopwatch' ? 'Stopwatch' : MODE_LABEL[s.timer.mode]}`
        : baseTitle
    }, 250)
    return () => { clearInterval(id); document.title = baseTitle }
  }, [])
}

/* ---------------------------------------------------------- shortcuts */

export function toggleFullscreen() {
  if (document.fullscreenElement) void document.exitFullscreen()
  else void document.documentElement.requestFullscreen?.().catch(() => {})
}

export function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (el.closest('input, textarea, select, [contenteditable="true"]') || e.metaKey || e.ctrlKey || e.altKey) return
      const s = useStore.getState()
      switch (e.key.toLowerCase()) {
        case ' ': e.preventDefault(); s.toggle(); break
        case 'r': s.reset(); break
        case 'n': s.skip(); break
        case 'f': toggleFullscreen(); break
        case '1': s.setView('ambient'); break
        case '2': s.setView('home'); break
        case '3': s.setView('focus'); break
        case 't': s.togglePanel('tasks'); break
        case 'm': s.togglePanel('music'); break
        case 'j': s.togglePanel('notes'); break
        case ',': s.settingsOpen ? s.closeSettings() : s.openSettings(); break
        case 'c': s.settingsOpen ? s.closeSettings() : s.openSettings('modes'); break
        case 'escape':
          if (s.settingsOpen) s.closeSettings()
          else s.closePanels()
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}

/* ------------------------------------------------------ idle + parallax */

export function useIdle(enabled: boolean, ms = 4000) {
  const [idle, setIdle] = useState(false)
  useEffect(() => {
    if (!enabled) { setIdle(false); return }
    let t = window.setTimeout(() => setIdle(true), ms)
    const wake = () => {
      setIdle(false)
      clearTimeout(t)
      t = window.setTimeout(() => setIdle(true), ms)
    }
    const evs = ['pointermove', 'pointerdown', 'keydown', 'wheel'] as const
    evs.forEach((e) => window.addEventListener(e, wake, { passive: true }))
    return () => { clearTimeout(t); evs.forEach((e) => window.removeEventListener(e, wake)) }
  }, [enabled, ms])
  return idle
}

/** Writes --mx / --my (−1…1) on <html> for CSS-driven depth effects. */
export function useParallax() {
  useEffect(() => {
    let raf = 0
    let tx = 0, ty = 0, x = 0, y = 0
    const root = document.documentElement
    const onMove = (e: PointerEvent) => {
      tx = (e.clientX / window.innerWidth) * 2 - 1
      ty = (e.clientY / window.innerHeight) * 2 - 1
      if (!raf) raf = requestAnimationFrame(step)
    }
    const step = () => {
      x += (tx - x) * 0.08
      y += (ty - y) * 0.08
      root.style.setProperty('--mx', x.toFixed(4))
      root.style.setProperty('--my', y.toFixed(4))
      raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.001 ? requestAnimationFrame(step) : 0
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => { window.removeEventListener('pointermove', onMove); cancelAnimationFrame(raf) }
  }, [])
}

/* ---------------------------------------------------- prevent sleep */

const useWakeStatus = create<{ status: 'Active' | 'Inactive' | 'Unsupported' }>(() => ({ status: 'Inactive' }))
export const useWakeLock = () => useWakeStatus((s) => s.status)

interface WakeSentinel { release(): Promise<void>; addEventListener(t: 'release', f: () => void): void }

/** Holds a screen wake lock while enabled, re-acquiring it when the tab becomes visible again. */
export function useWakeLockManager(enabled: boolean) {
  useEffect(() => {
    const api = (navigator as unknown as { wakeLock?: { request(t: 'screen'): Promise<WakeSentinel> } }).wakeLock
    if (!api) { useWakeStatus.setState({ status: 'Unsupported' }); return }
    if (!enabled) { useWakeStatus.setState({ status: 'Inactive' }); return }
    let lock: WakeSentinel | null = null
    let alive = true
    const acquire = async () => {
      if (document.visibilityState !== 'visible' || !alive) return
      try {
        lock = await api.request('screen')
        useWakeStatus.setState({ status: 'Active' })
        lock.addEventListener('release', () => { if (alive) useWakeStatus.setState({ status: 'Inactive' }) })
      } catch { useWakeStatus.setState({ status: 'Inactive' }) }
    }
    void acquire()
    document.addEventListener('visibilitychange', acquire)
    return () => { alive = false; document.removeEventListener('visibilitychange', acquire); void lock?.release(); useWakeStatus.setState({ status: 'Inactive' }) }
  }, [enabled])
}

/* ------------------------------------------------------- clear mode */

/** True while the mouse is outside the browser window (for Clear mode). */
export function usePointerAway(enabled: boolean) {
  const [away, setAway] = useState(false)
  useEffect(() => {
    if (!enabled) { setAway(false); return }
    const leave = (e: MouseEvent) => { if (!e.relatedTarget) setAway(true) }
    const enter = () => setAway(false)
    const blur = () => setAway(true)
    document.addEventListener('mouseout', leave)
    document.addEventListener('mouseover', enter)
    window.addEventListener('blur', blur)
    return () => { document.removeEventListener('mouseout', leave); document.removeEventListener('mouseover', enter); window.removeEventListener('blur', blur) }
  }, [enabled])
  return away
}

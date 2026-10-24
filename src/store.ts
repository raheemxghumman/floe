import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ViewMode = 'home' | 'ambient' | 'focus'
export type TimerMode = 'focus' | 'short' | 'long'
export type PanelId = 'tasks' | 'music' | 'notes'
export type SettingsSection =
  | 'themes' | 'clock' | 'timer' | 'stats' | 'quotes' | 'music' | 'extras' | 'account' | 'about'
export type ClockStyle = 'classic' | 'flip' | 'ring' | 'analog' | 'minimal' | 'pixel' | 'words' | 'poster'
export type ProgressStyle = 'ring' | 'bar' | 'glow' | 'off'
export type AlarmSound = 'bell' | 'chime' | 'digital' | 'soft' | 'none'

export interface Task { id: string; text: string; done: boolean; pomos: number; createdAt: number; doneAt?: number }
export interface Note { id: string; body: string; updatedAt: number }
export interface Session { at: number; minutes: number; type: TimerMode }
export interface CustomTheme { id: string; name: string; kind: 'image' | 'video' | 'youtube'; src: string; local?: boolean }

export interface TimerSettings {
  focus: number
  short: number
  long: number
  longEvery: number
  autoBreaks: boolean
  autoFocus: boolean
  sound: AlarmSound
  volume: number
  notify: boolean
  tabTitle: boolean
}

export interface Settings {
  name: string
  logoText: string
  showLogo: boolean
  greeting: boolean
  hideIdle: boolean
  themes: Record<ViewMode, string>
  customThemes: CustomTheme[]
  dim: number
  streamSound: boolean
  clock: { format: '12' | '24'; seconds: boolean; ampm: boolean; style: ClockStyle; progress: ProgressStyle }
  companion: boolean
  timer: TimerSettings
  quotes: { show: boolean; rotate: number; custom: string[]; onlyCustom: boolean }
  spotify: { clientId: string; uri: string; compact: boolean }
}

export interface TimerState {
  mode: TimerMode
  running: boolean
  endAt: number
  remaining: number
  cycle: number
}

const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4)
const mins = (m: number) => Math.round(m * 60_000)

export const defaultSettings: Settings = {
  name: '',
  logoText: 'floe',
  showLogo: true,
  greeting: true,
  hideIdle: true,
  themes: { home: 'twilight', ambient: 'forest', focus: 'rain' },
  customThemes: [],
  dim: 0.15,
  streamSound: false,
  clock: { format: '12', seconds: false, ampm: false, style: 'classic', progress: 'ring' },
  companion: true,
  timer: {
    focus: 25, short: 5, long: 15, longEvery: 4,
    autoBreaks: false, autoFocus: false,
    sound: 'bell', volume: 0.6, notify: false, tabTitle: true,
  },
  quotes: { show: true, rotate: 60, custom: [], onlyCustom: false },
  spotify: {
    // optional override; the built-in ID lives in lib/spotify (BUILT_IN_CLIENT_ID)
    clientId: '',
    uri: 'spotify:playlist:37i9dQZF1DWWQRwui0ExPn',
    compact: true,
  },
}

interface State {
  view: ViewMode
  settings: Settings
  timer: TimerState
  tasks: Task[]
  activeTaskId: string | null
  notes: Note[]
  activeNoteId: string | null
  sessions: Session[]
  tasksCompleted: number
  // ui-only (not persisted)
  panels: Record<PanelId, boolean>
  settingsOpen: boolean
  settingsSection: SettingsSection
  themeTarget: ViewMode

  setView: (v: ViewMode) => void
  togglePanel: (p: PanelId) => void
  closePanels: () => void
  openSettings: (section?: SettingsSection) => void
  closeSettings: () => void
  setSection: (s: SettingsSection) => void
  setThemeTarget: (v: ViewMode) => void

  update: (patch: Partial<Settings>) => void
  updateTimerSettings: (patch: Partial<TimerSettings>) => void
  updateClock: (patch: Partial<Settings['clock']>) => void
  updateQuotes: (patch: Partial<Settings['quotes']>) => void
  updateSpotify: (patch: Partial<Settings['spotify']>) => void
  setTheme: (view: ViewMode, id: string) => void
  addCustomTheme: (t: Omit<CustomTheme, 'id'>) => string
  removeCustomTheme: (id: string) => void

  addTask: (text: string) => void
  toggleTask: (id: string) => void
  editTask: (id: string, text: string) => void
  removeTask: (id: string) => void
  setActiveTask: (id: string | null) => void
  clearDone: () => void

  addNote: () => void
  updateNote: (id: string, body: string) => void
  removeNote: (id: string) => void
  setActiveNote: (id: string) => void

  start: () => void
  pause: () => void
  toggle: () => void
  reset: () => void
  skip: () => void
  setTimerMode: (m: TimerMode) => void
  complete: () => TimerMode

  importData: (data: unknown) => boolean
  resetAll: () => void
}

export const durationOf = (mode: TimerMode, t: TimerSettings) => mins(t[mode])

export const remainingOf = (timer: TimerState, now: number) =>
  timer.running ? Math.max(0, timer.endAt - now) : timer.remaining

function nextMode(mode: TimerMode, cycle: number, t: TimerSettings): TimerMode {
  if (mode !== 'focus') return 'focus'
  return cycle > 0 && cycle % t.longEvery === 0 ? 'long' : 'short'
}

const freshTimer = (t: TimerSettings): TimerState => ({
  mode: 'focus', running: false, endAt: 0, remaining: durationOf('focus', t), cycle: 0,
})

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      view: 'home',
      settings: defaultSettings,
      timer: freshTimer(defaultSettings.timer),
      tasks: [],
      activeTaskId: null,
      notes: [],
      activeNoteId: null,
      sessions: [],
      tasksCompleted: 0,
      panels: { tasks: false, music: false, notes: false },
      settingsOpen: false,
      settingsSection: 'themes',
      themeTarget: 'home',

      setView: (view) => set({ view, themeTarget: view }),
      togglePanel: (p) => set((s) => ({ panels: { ...s.panels, [p]: !s.panels[p] } })),
      closePanels: () => set({ panels: { tasks: false, music: false, notes: false } }),
      openSettings: (section) =>
        set((s) => ({ settingsOpen: true, settingsSection: section ?? s.settingsSection, themeTarget: s.view })),
      closeSettings: () => set({ settingsOpen: false }),
      setSection: (settingsSection) => set({ settingsSection }),
      setThemeTarget: (themeTarget) => set({ themeTarget }),

      update: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      updateTimerSettings: (patch) =>
        set((s) => {
          const prev = s.settings.timer
          const timer = { ...prev, ...patch }
          // keep an idle, untouched timer in sync with its new duration
          const idle = !s.timer.running && s.timer.remaining === durationOf(s.timer.mode, prev)
          return {
            settings: { ...s.settings, timer },
            timer: idle ? { ...s.timer, remaining: durationOf(s.timer.mode, timer) } : s.timer,
          }
        }),
      updateClock: (patch) => set((s) => ({ settings: { ...s.settings, clock: { ...s.settings.clock, ...patch } } })),
      updateQuotes: (patch) => set((s) => ({ settings: { ...s.settings, quotes: { ...s.settings.quotes, ...patch } } })),
      updateSpotify: (patch) => set((s) => ({ settings: { ...s.settings, spotify: { ...s.settings.spotify, ...patch } } })),
      setTheme: (view, id) => set((s) => ({ settings: { ...s.settings, themes: { ...s.settings.themes, [view]: id } } })),
      addCustomTheme: (t) => {
        const id = 'custom-' + uid()
        set((s) => ({ settings: { ...s.settings, customThemes: [...s.settings.customThemes, { ...t, id }] } }))
        return id
      },
      removeCustomTheme: (id) =>
        set((s) => {
          const themes = { ...s.settings.themes }
          for (const v of Object.keys(themes) as ViewMode[]) if (themes[v] === id) themes[v] = defaultSettings.themes[v]
          return { settings: { ...s.settings, themes, customThemes: s.settings.customThemes.filter((c) => c.id !== id) } }
        }),

      addTask: (text) => {
        const t = text.trim()
        if (!t) return
        set((s) => ({ tasks: [...s.tasks, { id: uid(), text: t, done: false, pomos: 0, createdAt: Date.now() }] }))
      },
      toggleTask: (id) =>
        set((s) => {
          const task = s.tasks.find((t) => t.id === id)
          if (!task) return s
          const done = !task.done
          return {
            tasks: s.tasks.map((t) => (t.id === id ? { ...t, done, doneAt: done ? Date.now() : undefined } : t)),
            tasksCompleted: Math.max(0, s.tasksCompleted + (done ? 1 : -1)),
            activeTaskId: done && s.activeTaskId === id ? null : s.activeTaskId,
          }
        }),
      editTask: (id, text) => set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, text } : t)) })),
      removeTask: (id) =>
        set((s) => ({
          tasks: s.tasks.filter((t) => t.id !== id),
          activeTaskId: s.activeTaskId === id ? null : s.activeTaskId,
        })),
      setActiveTask: (activeTaskId) => set({ activeTaskId }),
      clearDone: () => set((s) => ({ tasks: s.tasks.filter((t) => !t.done) })),

      addNote: () => {
        const id = uid()
        set((s) => ({ notes: [{ id, body: '', updatedAt: Date.now() }, ...s.notes], activeNoteId: id }))
      },
      updateNote: (id, body) =>
        set((s) => ({ notes: s.notes.map((n) => (n.id === id ? { ...n, body, updatedAt: Date.now() } : n)) })),
      removeNote: (id) =>
        set((s) => {
          const notes = s.notes.filter((n) => n.id !== id)
          return { notes, activeNoteId: s.activeNoteId === id ? notes[0]?.id ?? null : s.activeNoteId }
        }),
      setActiveNote: (activeNoteId) => set({ activeNoteId }),

      start: () =>
        set((s) => {
          if (s.timer.running) return s
          const remaining = s.timer.remaining > 0 ? s.timer.remaining : durationOf(s.timer.mode, s.settings.timer)
          return { timer: { ...s.timer, running: true, remaining, endAt: Date.now() + remaining } }
        }),
      pause: () =>
        set((s) => (s.timer.running
          ? { timer: { ...s.timer, running: false, remaining: Math.max(0, s.timer.endAt - Date.now()) } }
          : s)),
      toggle: () => (get().timer.running ? get().pause() : get().start()),
      reset: () =>
        set((s) => ({ timer: { ...s.timer, running: false, endAt: 0, remaining: durationOf(s.timer.mode, s.settings.timer) } })),
      skip: () =>
        set((s) => {
          const t = s.settings.timer
          const mode = nextMode(s.timer.mode, s.timer.mode === 'focus' ? s.timer.cycle + 1 : s.timer.cycle, t)
          return { timer: { ...s.timer, mode, running: false, endAt: 0, remaining: durationOf(mode, t) } }
        }),
      setTimerMode: (mode) =>
        set((s) => ({ timer: { ...s.timer, mode, running: false, endAt: 0, remaining: durationOf(mode, s.settings.timer) } })),
      complete: () => {
        const s = get()
        const t = s.settings.timer
        const finished = s.timer.mode
        const cycle = finished === 'focus' ? s.timer.cycle + 1 : s.timer.cycle
        const mode = nextMode(finished, cycle, t)
        const auto = mode === 'focus' ? t.autoFocus : t.autoBreaks
        const dur = durationOf(mode, t)
        set({
          sessions: [...s.sessions, { at: Date.now(), minutes: t[finished], type: finished }],
          tasks: finished === 'focus' && s.activeTaskId
            ? s.tasks.map((x) => (x.id === s.activeTaskId ? { ...x, pomos: x.pomos + 1 } : x))
            : s.tasks,
          timer: { mode, cycle, running: auto, remaining: dur, endAt: auto ? Date.now() + dur : 0 },
        })
        return finished
      },

      importData: (data) => {
        if (!data || typeof data !== 'object') return false
        const d = data as Partial<State>
        if (!d.settings) return false
        set({
          settings: { ...defaultSettings, ...d.settings },
          tasks: d.tasks ?? [],
          notes: d.notes ?? [],
          sessions: d.sessions ?? [],
          tasksCompleted: d.tasksCompleted ?? 0,
        })
        return true
      },
      resetAll: () =>
        set({
          settings: defaultSettings,
          timer: freshTimer(defaultSettings.timer),
          tasks: [], notes: [], sessions: [], tasksCompleted: 0,
          activeTaskId: null, activeNoteId: null, view: 'home',
        }),
    }),
    {
      name: 'floe-v1',
      version: 2,
      migrate: (persisted, version) => {
        const p = persisted as { settings?: { spotify?: { compact?: boolean } } }
        // v2: compact Spotify player became the default (the tracklist is now a toggle)
        if (version < 2 && p?.settings?.spotify) p.settings.spotify.compact = true
        return p as never
      },
      partialize: (s) => ({
        view: s.view,
        settings: s.settings,
        timer: s.timer,
        tasks: s.tasks,
        activeTaskId: s.activeTaskId,
        notes: s.notes,
        activeNoteId: s.activeNoteId,
        sessions: s.sessions,
        tasksCompleted: s.tasksCompleted,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<State>
        const ps = p.settings ?? ({} as Partial<Settings>)
        return {
          ...current,
          ...p,
          settings: {
            ...defaultSettings,
            ...ps,
            themes: { ...defaultSettings.themes, ...ps.themes },
            clock: { ...defaultSettings.clock, ...ps.clock },
            timer: { ...defaultSettings.timer, ...ps.timer },
            quotes: { ...defaultSettings.quotes, ...ps.quotes },
            spotify: { ...defaultSettings.spotify, ...ps.spotify },
          },
        }
      },
    },
  ),
)

/** Ticking clock shared by every component that shows time. */
export const useNow = create<{ now: number }>(() => ({ now: Date.now() }))

export function fmtTimer(ms: number) {
  const total = Math.ceil(ms / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

export const MODE_LABEL: Record<TimerMode, string> = { focus: 'Focus', short: 'Short Break', long: 'Long Break' }

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ViewMode = 'home' | 'ambient' | 'focus'
export type TimerMode = 'focus' | 'short' | 'long'
export type PanelId = 'tasks' | 'music' | 'notes'
export type SettingsSection =
  | 'themes' | 'modes' | 'companions' | 'clock' | 'timer' | 'stats' | 'quotes' | 'music' | 'extras' | 'account' | 'support' | 'about'
export type ClockStyle = 'classic' | 'flip' | 'ring' | 'analog' | 'minimal' | 'pixel' | 'words' | 'poster' | 'bar' | 'gauge' | 'dots' | 'pie'
export type ClockFont = 'bold' | 'light' | 'soft' | 'bubble' | 'minimal-light' | 'minimal' | 'serif' | 'serif-condensed' | 'sporty' | 'heavy-wide' | 'digital' | 'handwritten'
export type TallyStyle = 'tomatoes' | 'dots' | 'stars' | 'hearts' | 'bars' | 'numbers'
export type TimerKind = 'pomodoro' | 'countdown' | 'stopwatch'
export type QuotePosition = 'top-right' | 'top-left' | 'bottom' | 'below-clock'
export type ProgressStyle = 'orbit' | 'ring' | 'bar' | 'glow' | 'off'
export type CompanionId = 'tomato' | 'cat' | 'fox' | 'ghost' | 'robot' | 'sprout'
export type AccessoryId = 'none' | 'headphones' | 'party' | 'flowers' | 'wizard' | 'crown'
export type CompanionSpot = 'beside' | 'left' | 'right'
export type CompanionSize = 'sm' | 'md' | 'lg'

/** Everything a single mode (Home / Ambient / Focus) can be customized with. */
export interface ModeConfig {
  clockStyle: ClockStyle
  progress: ProgressStyle
  companion: CompanionId | 'none'
  spot: CompanionSpot
  size: CompanionSize
  greeting: boolean
  quote: boolean
  modeTabs: boolean
  cycle: boolean
  task: boolean
  timerCard: boolean
}

export interface PetSettings {
  accessory: AccessoryId
  motion: 'lively' | 'calm' | 'still'
  effect: 'none' | 'sparkles' | 'golden'
  chatter: boolean
  /** highest level whose celebration has been shown */
  seenLevel: number
}
export type AlarmSound = 'bell' | 'chime' | 'digital' | 'soft' | 'sparkle' | 'marimba' | 'gong' | 'kalimba' | 'birds' | 'arcade' | 'none'

export interface Task { id: string; text: string; done: boolean; pomos: number; createdAt: number; doneAt?: number; est?: number }
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
  kind: TimerKind
  taskEta: boolean
  streak: boolean
  pipTask: boolean
  tally: TallyStyle
}

export interface Settings {
  name: string
  logoText: string
  showLogo: boolean
  hideIdle: boolean
  themes: Record<ViewMode, string>
  customThemes: CustomTheme[]
  dim: number
  streamSound: boolean
  clock: { format: '12' | '24'; seconds: boolean; ampm: boolean; size: 'sm' | 'md' | 'lg'; font: ClockFont; dynamicGreeting: boolean }
  modes: Record<ViewMode, ModeConfig>
  pet: PetSettings
  timer: TimerSettings
  quotes: { show: boolean; rotate: number; custom: string[]; onlyCustom: boolean; size: 'sm' | 'md' | 'lg'; position: QuotePosition; offset: number }
  perf: { staticThemes: boolean; clearMode: boolean; wakeLock: boolean }
  defaultTab: SettingsSection | 'recent'
  randomTheme: 'off' | 'all' | 'gradients' | 'abstract' | 'scenic' | 'nature' | 'urban' | 'interior' | 'animated'
  ytFavorites: { id: string; title: string }[]
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

const MODE_BASE: ModeConfig = {
  clockStyle: 'classic', progress: 'off', companion: 'none', spot: 'beside', size: 'md',
  greeting: true, quote: true, modeTabs: true, cycle: true, task: true, timerCard: true,
}

/** Deep-merges partial settings (from storage, the cloud or an import) over a base. */
export function mergeSettings(base: Settings, inc: Partial<Settings> | undefined): Settings {
  if (!inc) return base
  const modes = { ...base.modes }
  for (const v of ['home', 'focus', 'ambient'] as ViewMode[]) modes[v] = { ...base.modes[v], ...inc.modes?.[v] }
  return {
    ...base, ...inc,
    themes: { ...base.themes, ...inc.themes },
    clock: { ...base.clock, ...inc.clock },
    timer: { ...base.timer, ...inc.timer },
    quotes: { ...base.quotes, ...inc.quotes },
    spotify: { ...base.spotify, ...inc.spotify },
    pet: { ...base.pet, ...inc.pet },
    perf: { ...base.perf, ...inc.perf },
    modes,
  }
}

export const defaultSettings: Settings = {
  name: '',
  logoText: 'floe',
  showLogo: true,
  hideIdle: true,
  themes: { home: 'thermal', ambient: 'forest', focus: 'rain' },
  customThemes: [],
  dim: 0.15,
  streamSound: false,
  clock: { format: '12', seconds: false, ampm: false, size: 'md', font: 'bold', dynamicGreeting: true },
  modes: {
    home: { ...MODE_BASE, progress: 'orbit' },
    focus: { ...MODE_BASE, progress: 'ring', companion: 'tomato', quote: false },
    ambient: { ...MODE_BASE, progress: 'bar', spot: 'left', quote: false },
  },
  pet: { accessory: 'none', motion: 'lively', effect: 'none', chatter: true, seenLevel: 1 },
  timer: {
    focus: 25, short: 5, long: 15, longEvery: 4,
    autoBreaks: false, autoFocus: false,
    sound: 'bell', volume: 0.6, notify: false, tabTitle: true,
    kind: 'pomodoro', taskEta: false, streak: true, pipTask: true, tally: 'tomatoes',
  },
  quotes: { show: true, rotate: 60, custom: [], onlyCustom: false, size: 'md', position: 'top-right', offset: 0 },
  perf: { staticThemes: false, clearMode: false, wakeLock: false },
  defaultTab: 'recent',
  randomTheme: 'off',
  ytFavorites: [],
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
  updateMode: (view: ViewMode, patch: Partial<ModeConfig>) => void
  updatePet: (patch: Partial<PetSettings>) => void
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
  setTaskEst: (id: string, est: number | undefined) => void

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

/** Length of a segment. In Task ETA mode, focus follows the active task's estimate. */
export function durationOf(mode: TimerMode, t: TimerSettings, est?: number) {
  if (t.kind === 'stopwatch') return mins(60)
  if (mode === 'focus' && t.taskEta && est) return mins(est)
  return mins(t[mode])
}
const estOf = (s: { tasks: Task[]; activeTaskId: string | null }) => s.tasks.find((x) => x.id === s.activeTaskId)?.est

export const remainingOf = (timer: TimerState, now: number) =>
  timer.running ? Math.max(0, timer.endAt - now) : timer.remaining

/** Stopwatch: endAt is the (shifted) start time, remaining holds elapsed time while paused. */
export const elapsedOf = (timer: TimerState, now: number) => (timer.running ? now - timer.endAt : timer.remaining)

function nextMode(mode: TimerMode, cycle: number, t: TimerSettings): TimerMode {
  if (t.kind !== 'pomodoro') return 'focus'
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
        set((s) => ({
          settingsOpen: true,
          // an explicit section wins; otherwise the user's default tab, or wherever they were last
          settingsSection: section ?? (s.settings.defaultTab !== 'recent' ? s.settings.defaultTab : s.settingsSection),
          themeTarget: s.view,
        })),
      closeSettings: () => set({ settingsOpen: false }),
      setSection: (settingsSection) => set({ settingsSection }),
      setThemeTarget: (themeTarget) => set({ themeTarget }),

      update: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      updateTimerSettings: (patch) =>
        set((s) => {
          const prev = s.settings.timer
          const timer = { ...prev, ...patch }
          const est = estOf(s)
          // switching timer kind starts fresh; otherwise keep an idle, untouched timer in sync
          if (patch.kind && patch.kind !== prev.kind) {
            return {
              settings: { ...s.settings, timer },
              timer: { mode: 'focus' as TimerMode, cycle: 0, running: false, endAt: 0, remaining: timer.kind === 'stopwatch' ? 0 : durationOf('focus', timer, est) },
            }
          }
          const idle = !s.timer.running && prev.kind !== 'stopwatch' && s.timer.remaining === durationOf(s.timer.mode, prev, est)
          return {
            settings: { ...s.settings, timer },
            timer: idle ? { ...s.timer, remaining: durationOf(s.timer.mode, timer, est) } : s.timer,
          }
        }),
      updateClock: (patch) => set((s) => ({ settings: { ...s.settings, clock: { ...s.settings.clock, ...patch } } })),
      updateQuotes: (patch) => set((s) => ({ settings: { ...s.settings, quotes: { ...s.settings.quotes, ...patch } } })),
      updateMode: (view, patch) => set((s) => ({ settings: { ...s.settings, modes: { ...s.settings.modes, [view]: { ...s.settings.modes[view], ...patch } } } })),
      updatePet: (patch) => set((s) => ({ settings: { ...s.settings, pet: { ...s.settings.pet, ...patch } } })),
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
      setActiveTask: (activeTaskId) =>
        set((s) => {
          const t = s.settings.timer
          // in Task ETA mode an untouched focus timer adopts the newly chosen task's estimate
          const untouched = !s.timer.running && s.timer.mode === 'focus' && t.kind !== 'stopwatch' && s.timer.remaining === durationOf('focus', t, estOf(s))
          const est = s.tasks.find((x) => x.id === activeTaskId)?.est
          return { activeTaskId, timer: untouched && t.taskEta ? { ...s.timer, remaining: durationOf('focus', t, est) } : s.timer }
        }),
      setTaskEst: (id, est) => set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, est: est && est > 0 ? Math.min(600, est) : undefined } : t)) })),
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
          if (s.settings.timer.kind === 'stopwatch') return { timer: { ...s.timer, running: true, endAt: Date.now() - s.timer.remaining } }
          const remaining = s.timer.remaining > 0 ? s.timer.remaining : durationOf(s.timer.mode, s.settings.timer, estOf(s))
          return { timer: { ...s.timer, running: true, remaining, endAt: Date.now() + remaining } }
        }),
      pause: () =>
        set((s) => (s.timer.running
          ? { timer: { ...s.timer, running: false, remaining: s.settings.timer.kind === 'stopwatch' ? Date.now() - s.timer.endAt : Math.max(0, s.timer.endAt - Date.now()) } }
          : s)),
      toggle: () => (get().timer.running ? get().pause() : get().start()),
      reset: () =>
        set((s) => ({ timer: { ...s.timer, running: false, endAt: 0, remaining: s.settings.timer.kind === 'stopwatch' ? 0 : durationOf(s.timer.mode, s.settings.timer, estOf(s)) } })),
      skip: () =>
        set((s) => {
          const t = s.settings.timer
          if (t.kind === 'stopwatch') {
            // "finish": save the stopwatch run as a focus session if it lasted at least a minute
            const elapsed = elapsedOf(s.timer, Date.now())
            const minutes = Math.round(elapsed / 60_000)
            return {
              sessions: minutes >= 1 ? [...s.sessions, { at: Date.now(), minutes, type: 'focus' as TimerMode }] : s.sessions,
              timer: { ...s.timer, running: false, endAt: 0, remaining: 0, cycle: minutes >= 1 ? s.timer.cycle + 1 : s.timer.cycle },
            }
          }
          const mode = nextMode(s.timer.mode, s.timer.mode === 'focus' ? s.timer.cycle + 1 : s.timer.cycle, t)
          return { timer: { ...s.timer, mode, running: false, endAt: 0, remaining: durationOf(mode, t, estOf(s)) } }
        }),
      setTimerMode: (mode) =>
        set((s) => (s.settings.timer.kind === 'stopwatch' ? s
          : { timer: { ...s.timer, mode, running: false, endAt: 0, remaining: durationOf(mode, s.settings.timer, estOf(s)) } })),
      complete: () => {
        const s = get()
        const t = s.settings.timer
        const finished = s.timer.mode
        const cycle = finished === 'focus' ? s.timer.cycle + 1 : s.timer.cycle
        const mode = nextMode(finished, cycle, t)
        const auto = mode === 'focus' ? t.autoFocus : t.autoBreaks
        const dur = durationOf(mode, t, estOf(s))
        set({
          sessions: [...s.sessions, { at: Date.now(), minutes: Math.round(durationOf(finished, t, estOf(s)) / 60_000), type: finished }],
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
          settings: mergeSettings(defaultSettings, d.settings),
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
      version: 3,
      migrate: (persisted, version) => {
        const p = persisted as { settings?: Record<string, unknown> & { spotify?: { compact?: boolean } } }
        // v2: compact Spotify player became the default (the tracklist is now a toggle)
        if (version < 2 && p?.settings?.spotify) p.settings.spotify.compact = true
        // v3: clock style / progress / greeting / companion moved into per-mode settings
        if (version < 3 && p?.settings) {
          const old = p.settings as { clock?: { style?: ClockStyle; progress?: string }; greeting?: boolean; companion?: boolean }
          const home: Partial<ModeConfig> = {}
          if (old.clock?.style) home.clockStyle = old.clock.style
          if (old.clock?.progress) home.progress = (old.clock.progress === 'ring' ? 'orbit' : old.clock.progress) as ProgressStyle
          if (old.greeting === false) home.greeting = false
          p.settings.modes = { home, focus: old.companion === false ? { companion: 'none' } : {}, ambient: {} }
        }
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
          settings: mergeSettings(defaultSettings, ps),
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

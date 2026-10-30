import { useEffect } from 'react'
import './styles/app.css'
import './styles/clocks.css'
import './styles/themes.css'
import './styles/gate.css'
import './styles/pets.css'
import './styles/library.css'
import './styles/prefs.css'
import { useStore } from './store'
import { toast, useIdle, useParallax, usePointerAway, useShortcuts, useTimerEngine, useWakeLockManager } from './hooks'
import { randomizeThemes } from './components/settings/prefs'
import { usePresence } from './lib/presence'
import { handleRedirect } from './lib/spotify'
import { initAccount, useAccount } from './lib/account'
import { cloudEnabled } from './lib/supabase'
import { AuthGate } from './components/AuthGate'
import { resolveTheme } from './themes'
import { Background } from './components/Background'
import { CornerCompanion, FocusView, HomeView, QuoteBlock, TimerCard } from './components/views'
import { LevelUp } from './components/LevelUp'
import { Dock, Toasts, Toolbar } from './components/chrome'
import { TasksPanel } from './components/panels/TasksPanel'
import { NotesPanel } from './components/panels/NotesPanel'
import { MusicPanel } from './components/panels/MusicPanel'
import { SettingsDrawer } from './components/settings/SettingsDrawer'

initAccount()
// dev-only handle for automated UI tests; stripped from production builds
if (import.meta.env.DEV) (window as unknown as { __floe: typeof useStore }).__floe = useStore

export default function App() {
  useTimerEngine()
  useShortcuts()
  useParallax()

  const view = useStore((s) => s.view)
  const showLogo = useStore((s) => s.settings.showLogo)
  const logoText = useStore((s) => s.settings.logoText)
  const hideIdle = useStore((s) => s.settings.hideIdle)
  const anyPanel = useStore((s) => Object.values(s.panels).some(Boolean))
  const settingsOpen = useStore((s) => s.settingsOpen)
  const tone = useStore((s) => resolveTheme(s.settings.themes[s.view], s.settings.customThemes).tone)
  const clockFont = useStore((s) => s.settings.clock.font)
  const clockSize = useStore((s) => s.settings.clock.size)
  const { ready, user } = useAccount()
  const perf = useStore((s) => s.settings.perf)
  useWakeLockManager(perf.wakeLock)
  usePresence('app')
  const away = usePointerAway(perf.clearMode)
  // Theme randomizer: a fresh look on every load
  useEffect(() => {
    const pool = useStore.getState().settings.randomTheme
    if (pool !== 'off') randomizeThemes(pool)
  }, [])
  const idle = useIdle(view === 'ambient' && hideIdle && !anyPanel && !settingsOpen)

  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has('code') && !window.location.search.includes('error=')) return
    void handleRedirect().then((err) => {
      if (err) { toast(err); return }
      toast('Spotify connected')
      if (!useStore.getState().panels.music) useStore.getState().togglePanel('music')
    })
  }, [])

  // the app is members-only: show the sign-in / request-access screen until there's a session
  if (cloudEnabled && (!ready || !user)) {
    return (
      <div className="app v-home">
        <Background />
        {ready ? <AuthGate /> : <div className="gate-loading" aria-label="Loading"><span /></div>}
        <Toasts />
      </div>
    )
  }

  return (
    <div className={`app v-${view} ${idle || away ? 'idle' : ''} ${settingsOpen ? 'drawer-open' : ''} ${tone === 'light' ? 'tone-light' : ''} cf-${clockFont} csz-${clockSize}`}>
      <Background />
      <div className="ui">
        {showLogo && <a className="logo" href="/" aria-label="Home page">{logoText || 'floe'}</a>}
        <div className="top-right">
          <TimerCard active={view === 'ambient'} />
        </div>
        <QuoteBlock view={view} />
        <HomeView active={view === 'home'} />
        <FocusView active={view === 'focus'} />
        <Toolbar />
        <Dock />
        <TasksPanel />
        <NotesPanel />
        <MusicPanel />
        <CornerCompanion view={view} />
      </div>
      <LevelUp />
      <SettingsDrawer />
      <Toasts />
    </div>
  )
}

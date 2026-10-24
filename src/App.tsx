import { useEffect } from 'react'
import './styles/app.css'
import './styles/clocks.css'
import './styles/themes.css'
import { useStore } from './store'
import { toast, useIdle, useParallax, useShortcuts, useTimerEngine } from './hooks'
import { handleRedirect } from './lib/spotify'
import { initAccount } from './lib/account'
import { resolveTheme } from './themes'
import { Background } from './components/Background'
import { FocusView, HomeView, QuoteBlock, TimerCard } from './components/views'
import { Dock, Toasts, Toolbar } from './components/chrome'
import { TasksPanel } from './components/panels/TasksPanel'
import { NotesPanel } from './components/panels/NotesPanel'
import { MusicPanel } from './components/panels/MusicPanel'
import { SettingsDrawer } from './components/settings/SettingsDrawer'

initAccount()

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
  const idle = useIdle(view === 'ambient' && hideIdle && !anyPanel && !settingsOpen)

  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has('code') && !window.location.search.includes('error=')) return
    void handleRedirect().then((err) => {
      if (err) { toast(err); return }
      toast('Spotify connected')
      if (!useStore.getState().panels.music) useStore.getState().togglePanel('music')
    })
  }, [])

  return (
    <div className={`app v-${view} ${idle ? 'idle' : ''} ${settingsOpen ? 'drawer-open' : ''} ${tone === 'light' ? 'tone-light' : ''}`}>
      <Background />
      <div className="ui">
        {showLogo && <a className="logo" href="/" aria-label="Home page">{logoText || 'floe'}</a>}
        <div className="top-right">
          <QuoteBlock active={view === 'home'} />
          <TimerCard active={view === 'ambient'} />
        </div>
        <HomeView active={view === 'home'} />
        <FocusView active={view === 'focus'} />
        <Toolbar />
        <Dock />
        <TasksPanel />
        <NotesPanel />
        <MusicPanel />
      </div>
      <SettingsDrawer />
      <Toasts />
    </div>
  )
}

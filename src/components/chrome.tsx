import { useEffect, useState } from 'react'
import { Cloud, House, Lightbulb, ListTodo, Maximize2, Minimize2, Music, PenLine, Settings, SlidersHorizontal, UserRound } from 'lucide-react'
import { useAccount } from '../lib/account'
import { cloudEnabled } from '../lib/supabase'
import { useStore, type PanelId, type ViewMode } from '../store'
import { toggleFullscreen, useToasts } from '../hooks'

const VIEWS: { v: ViewMode; label: string; icon: typeof Cloud; key: string }[] = [
  { v: 'ambient', label: 'Ambient', icon: Cloud, key: '1' },
  { v: 'home', label: 'Home', icon: House, key: '2' },
  { v: 'focus', label: 'Focus', icon: Lightbulb, key: '3' },
]

function AccountButton() {
  const user = useAccount((s) => s.user)
  const profile = useAccount((s) => s.profile)
  const openSettings = useStore((s) => s.openSettings)
  const label = user ? (profile?.display_name ?? profile?.username ?? 'Account') : 'Sign in'
  return (
    <button className={`sq-btn acct-btn ${user ? 'signed' : ''}`} onClick={() => openSettings('account')} aria-label={label} data-tip={label}>
      {user ? <span>{label.slice(0, 1).toUpperCase()}</span> : <UserRound size={17} />}
    </button>
  )
}

export function Dock() {
  const view = useStore((s) => s.view)
  const setView = useStore((s) => s.setView)
  const openSettings = useStore((s) => s.openSettings)
  const [fs, setFs] = useState(false)
  useEffect(() => {
    const on = () => setFs(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', on)
    return () => document.removeEventListener('fullscreenchange', on)
  }, [])
  const i = VIEWS.findIndex((x) => x.v === view)

  return (
    <nav className="dock" aria-label="Modes">
      <div className="dock-group" style={{ ['--i' as string]: i }}>
        <span className="dock-ind" />
        {VIEWS.map(({ v, label, icon: Icon, key }) => (
          <button key={v} className={`dock-btn ${v === view ? 'on' : ''}`} onClick={() => setView(v)} aria-label={label} data-tip={`${label} · ${key}`}>
            <Icon size={17} />
          </button>
        ))}
        <span className="dock-label" key={view}>{VIEWS[i]?.label}</span>
      </div>
      {cloudEnabled && <AccountButton />}
      <button className="sq-btn" onClick={() => openSettings()} aria-label="Settings" data-tip="Settings · ,"><Settings size={17} /></button>
      <button className="sq-btn" onClick={toggleFullscreen} aria-label="Fullscreen" data-tip="Fullscreen · F">
        {fs ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
      </button>
    </nav>
  )
}

const TOOLS: { id: PanelId; label: string; icon: typeof Cloud; key: string }[] = [
  { id: 'tasks', label: 'Tasks', icon: ListTodo, key: 'T' },
  { id: 'music', label: 'Music', icon: Music, key: 'M' },
  { id: 'notes', label: 'Notes', icon: PenLine, key: 'J' },
]

export function Toolbar() {
  const panels = useStore((s) => s.panels)
  const toggle = useStore((s) => s.togglePanel)
  const pending = useStore((s) => s.tasks.filter((t) => !t.done).length)
  const openSettings = useStore((s) => s.openSettings)
  return (
    <nav className="toolbar" aria-label="Tools">
      {TOOLS.map(({ id, label, icon: Icon, key }) => (
        <button key={id} className={`sq-btn ${panels[id] ? 'on' : ''}`} onClick={() => toggle(id)} aria-label={label} data-tip={`${label} · ${key}`}>
          <Icon size={17} />
          {id === 'tasks' && pending > 0 && <span className="badge">{pending}</span>}
        </button>
      ))}
      <button className="sq-btn" onClick={() => openSettings('modes')} aria-label="Customize this mode" data-tip="Customize · C">
        <SlidersHorizontal size={17} />
      </button>
    </nav>
  )
}

export function Toasts() {
  const list = useToasts((s) => s.list)
  return (
    <div className="toasts" role="status">
      {list.map((t) => <div key={t.id} className="toast">{t.text}</div>)}
    </div>
  )
}

import { ChartColumn, CircleUser, Clock, LifeBuoy, Music, Palette, PawPrint, Quote, Rocket, SlidersHorizontal, Sparkles, Timer, X } from 'lucide-react'
import { useStore, type SettingsSection } from '../../store'
import { ThemesSection } from './ThemesSection'
import { StatsSection } from './StatsSection'
import { ModesSection } from './ModesSection'
import { CompanionsSection } from './CompanionsSection'
import { AboutSection, AccountSection, MusicSection } from './sections'
import { ClockSection, ExtrasSection, QuotesSection, SupportSection, TimerSection } from './prefs'

const NAV: { id: SettingsSection; label: string; icon: typeof Palette; badge?: string }[] = [
  { id: 'themes', label: 'Themes', icon: Palette, badge: 'NEW' },
  { id: 'modes', label: 'Modes', icon: SlidersHorizontal },
  { id: 'companions', label: 'Companions', icon: PawPrint, badge: 'NEW' },
  { id: 'clock', label: 'Clock', icon: Clock, badge: 'NEW' },
  { id: 'timer', label: 'Focus Timer', icon: Timer },
  { id: 'stats', label: 'Stats', icon: ChartColumn },
  { id: 'quotes', label: 'Quotes', icon: Quote },
  { id: 'music', label: 'Music', icon: Music },
  { id: 'extras', label: 'Extras', icon: Sparkles },
  { id: 'account', label: 'Account', icon: CircleUser },
  { id: 'support', label: 'Support', icon: LifeBuoy },
  { id: 'about', label: 'What’s New', icon: Rocket },
]

const BODY: Record<SettingsSection, () => JSX.Element> = {
  themes: ThemesSection, modes: ModesSection, companions: CompanionsSection, clock: ClockSection, timer: TimerSection, stats: StatsSection, quotes: QuotesSection,
  music: MusicSection, extras: ExtrasSection, account: AccountSection, support: SupportSection, about: AboutSection,
}

export function SettingsDrawer() {
  const open = useStore((s) => s.settingsOpen)
  const section = useStore((s) => s.settingsSection)
  const { closeSettings, setSection } = useStore.getState()
  const Body = BODY[section]

  return (
    <div className={`drawer-root ${open ? 'open' : ''}`} aria-hidden={!open}>
      <div className="drawer-scrim" onClick={closeSettings} />
      <aside className="drawer" role="dialog" aria-label="Settings">
        <nav className="drawer-nav">
          <button className="icon-btn ghost drawer-close" onClick={closeSettings} aria-label="Close settings"><X size={20} /></button>
          <ul>
            {NAV.map(({ id, label, icon: Icon, badge }, i) => (
              <li key={id} style={{ ['--d' as string]: `${i * 30}ms` }}>
                <button className={section === id ? 'on' : ''} onClick={() => setSection(id)}>
                  <Icon size={17} />
                  <span>{label}</span>
                  {badge && <em className="nav-badge">{badge}</em>}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <div className="drawer-body">
          {open && <div className="drawer-page" key={section}><Body /></div>}
        </div>
      </aside>
    </div>
  )
}

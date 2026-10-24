import type { ReactNode } from 'react'
import { Lock, Palette } from 'lucide-react'
import { useStore, type CompanionId, type CompanionSize, type CompanionSpot, type ModeConfig, type ViewMode } from '../../store'
import { resolveTheme } from '../../themes'
import { CLOCK_STYLES, PROGRESS_OPTIONS } from '../clocks'
import { COMPANION_IDS, COMPANIONS, CompanionArt } from '../companions'
import { isUnlocked, unlockLevel, useLevel } from '../../lib/levels'
import { Row, Section, Seg, Toggle } from './controls'
import { TiltCard } from './ThemesSection'

export const STYLE_PREVIEW: Record<string, ReactNode> = {
  classic: <span className="cs-classic">5:21</span>,
  flip: <span className="cs-flip"><b>05</b><b>21</b></span>,
  ring: <span className="cs-ring"><i /><b>5:21</b></span>,
  analog: <span className="cs-analog"><i className="h" /><i className="m" /></span>,
  minimal: <span className="cs-minimal">5:21</span>,
  pixel: <span className="cs-pixel">05:21</span>,
  words: <span className="cs-words">twenty-one<br />past five</span>,
  poster: <span className="cs-poster"><b>05</b><b>21</b></span>,
}

export const MODE_LABELS: { v: ViewMode; label: string }[] = [{ v: 'ambient', label: 'Ambient' }, { v: 'home', label: 'Home' }, { v: 'focus', label: 'Focus' }]

export function ModeTarget() {
  const target = useStore((s) => s.themeTarget)
  const setThemeTarget = useStore((s) => s.setThemeTarget)
  return <Seg<ViewMode> value={target} onChange={setThemeTarget} options={MODE_LABELS} />
}

/** Picker grid of companions; locked ones show the level that unlocks them. */
export function CompanionPicker({ value, onPick, includeNone }: { value: CompanionId | 'none'; onPick: (id: CompanionId | 'none') => void; includeNone?: boolean }) {
  const { level } = useLevel()
  const accessory = useStore((s) => s.settings.pet.accessory)
  return (
    <div className="pet-grid">
      {includeNone && (
        <TiltCard selected={value === 'none'} onClick={() => onPick('none')} className="pet-card none">
          <span className="pet-none">No companion</span>
        </TiltCard>
      )}
      {COMPANION_IDS.map((id) => {
        const open = isUnlocked('companion', id, level)
        return (
          <TiltCard key={id} selected={value === id} onClick={() => open && onPick(id)} className={`pet-card ${open ? '' : 'locked'}`}>
            <CompanionArt id={id} state="idle" level={level} accessory={open && isUnlocked('accessory', accessory, level) ? accessory : 'none'} />
            <span className="theme-name">{COMPANIONS[id].name}</span>
            {!open && <span className="pet-lock"><Lock size={12} /> Level {unlockLevel('companion', id)}</span>}
          </TiltCard>
        )
      })}
    </div>
  )
}

const SPOTS: { v: CompanionSpot; label: string }[] = [{ v: 'beside', label: 'By the clock' }, { v: 'left', label: 'Bottom left' }, { v: 'right', label: 'Bottom right' }]
const SIZES: { v: CompanionSize; label: string }[] = [{ v: 'sm', label: 'S' }, { v: 'md', label: 'M' }, { v: 'lg', label: 'L' }]

export function ModesSection() {
  const target = useStore((s) => s.themeTarget)
  const m = useStore((s) => s.settings.modes[s.themeTarget])
  const themeName = useStore((s) => resolveTheme(s.settings.themes[s.themeTarget], s.settings.customThemes).name)
  const { updateMode, setSection, setView } = useStore.getState()
  const set = (patch: Partial<ModeConfig>) => { updateMode(target, patch); setView(target) }
  const isClock = target === 'home'
  const selfProgress = m.clockStyle === 'ring' || m.clockStyle === 'analog'

  return (
    <>
      <Section title="Modes" sub="Make every screen your own. Changes show instantly behind this panel.">
        <div className="theme-target">
          <span className="muted small">Customizing</span>
          <ModeTarget />
          <button className="btn sm ghost now-using" onClick={() => setSection('themes')}><Palette size={14} /> Background: {themeName}</button>
        </div>
      </Section>

      <Section title={isClock ? 'Clock style' : 'Timer style'} sub={isClock ? 'How the current time looks.' : 'How the countdown looks. Every style works as a timer too.'}>
        <div className="clock-styles">
          {CLOCK_STYLES.map(({ v, label }) => (
            <TiltCard key={v} selected={m.clockStyle === v} onClick={() => set({ clockStyle: v })} className="clock-style">
              {STYLE_PREVIEW[v]}
              <span className="theme-name">{label}</span>
            </TiltCard>
          ))}
        </div>
      </Section>

      <Section title="Session progress" sub={isClock ? 'Appears around the clock while a session runs. The color shifts as it nears the end.' : 'How far along the current session is.'}>
        <Row label="Style" hint={selfProgress ? `${m.clockStyle === 'ring' ? 'Ring' : 'Analog'} already shows progress, so Ring and Orbit are hidden` : undefined}>
          <Seg value={m.progress} onChange={(v) => set({ progress: v })} options={PROGRESS_OPTIONS[target]} />
        </Row>
      </Section>

      <Section title="Companion" sub="Pick a buddy for this screen. They react to your timer.">
        <CompanionPicker value={m.companion} onPick={(id) => set({ companion: id })} includeNone />
        {m.companion !== 'none' && (
          <>
            <Row label="Position"><Seg value={m.spot} onChange={(v) => set({ spot: v })} options={SPOTS} /></Row>
            <Row label="Size"><Seg value={m.size} onChange={(v) => set({ size: v })} options={SIZES} /></Row>
          </>
        )}
        <Row label="Accessories, effects & levels"><button className="btn sm ghost" onClick={() => setSection('companions')}>Open companions</button></Row>
      </Section>

      <Section title="Show on this screen">
        {target === 'home' && <>
          <Row label="Greeting"><Toggle on={m.greeting} onChange={(v) => set({ greeting: v })} /></Row>
          <Row label="Quote"><Toggle on={m.quote} onChange={(v) => set({ quote: v })} /></Row>
        </>}
        {target === 'focus' && <>
          <Row label="Focus / break tabs"><Toggle on={m.modeTabs} onChange={(v) => set({ modeTabs: v })} /></Row>
          <Row label="Cycle tomatoes"><Toggle on={m.cycle} onChange={(v) => set({ cycle: v })} /></Row>
          <Row label="Current task"><Toggle on={m.task} onChange={(v) => set({ task: v })} /></Row>
        </>}
        {target === 'ambient' && <>
          <Row label="Timer card"><Toggle on={m.timerCard} onChange={(v) => set({ timerCard: v })} /></Row>
          <Row label="Quote"><Toggle on={m.quote} onChange={(v) => set({ quote: v })} /></Row>
        </>}
      </Section>
    </>
  )
}

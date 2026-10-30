import { useEffect, useState, type ReactNode } from 'react'
import { Bug, Mail, Play, RefreshCw, Shuffle, Trash2 } from 'lucide-react'
import { useStore, type AlarmSound, type ClockFont, type ClockStyle, type SettingsSection, type TallyStyle, type TimerKind } from '../../store'
import { playAlarm } from '../../lib/audio'
import { QUOTES } from '../../lib/quotes'
import { CATEGORIES, inCategory, LIBRARY } from '../../themes'
import { mailtoLink, OWNER_EMAIL, prettyWhatsApp, whatsappLink } from '../../lib/owner'
import { useWakeLock } from '../../hooks'
import { WhatsAppGlyph } from '../AuthGate'
import { Row, Section, Seg, Stepper, Toggle } from './controls'
import { STYLE_PREVIEW } from './ModesSection'

/* ----------------------------------------------------------- shared */

function Card({ title, sub, children, badge }: { title: string; sub?: string; children: ReactNode; badge?: string }) {
  return (
    <div className="p-card">
      <div className="p-card-head"><h4>{title}{badge && <em className="new-badge">{badge}</em>}</h4>{sub && <p className="muted small">{sub}</p>}</div>
      {children}
    </div>
  )
}

function Choice<T extends string>({ value, options, onChange, className = '' }: { value: T; options: { v: T; label: string; preview: ReactNode }[]; onChange: (v: T) => void; className?: string }) {
  return (
    <div className={`choice-grid ${className}`}>
      {options.map((o) => (
        <button key={o.v} className={`choice ${value === o.v ? 'on' : ''}`} onClick={() => onChange(o.v)}>
          <span className="choice-art">{o.preview}</span>
          <span className="choice-label">{o.label}</span>
        </button>
      ))}
    </div>
  )
}

/** A picker that shows the current choice and opens a list to change it (Flocus-style). */
function Picker<T extends string>({ label, value, options, onChange, onPreview }: { label: string; value: T; options: { v: T; label: string }[]; onChange: (v: T) => void; onPreview?: (v: T) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="picker">
      <div className="picker-now"><span className="muted small">Selected:</span> <strong>{options.find((o) => o.v === value)?.label}</strong>
        <button className="btn sm ghost" onClick={() => setOpen(!open)}>{open ? 'Done' : 'Change'}</button>
      </div>
      {open && (
        <div className="picker-list" role="listbox" aria-label={label}>
          {options.map((o) => (
            <button key={o.v} role="option" aria-selected={value === o.v} className={value === o.v ? 'on' : ''} onClick={() => { onChange(o.v); onPreview?.(o.v) }}>
              {onPreview && <Play size={12} />} {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------ clock */

const FONTS: { v: ClockFont; label: string }[] = [
  { v: 'bold', label: 'Default Bold' }, { v: 'light', label: 'Default Light' }, { v: 'soft', label: 'Soft' }, { v: 'bubble', label: 'Bubble' },
  { v: 'minimal-light', label: 'Minimal Light' }, { v: 'minimal', label: 'Minimal' }, { v: 'serif', label: 'Serif' }, { v: 'serif-condensed', label: 'Serif Condensed' },
  { v: 'sporty', label: 'Sporty' }, { v: 'heavy-wide', label: 'Heavy Wide' }, { v: 'digital', label: 'Digital' }, { v: 'handwritten', label: 'Handwritten' },
]

export function ClockSection() {
  const c = useStore((s) => s.settings.clock)
  const home = useStore((s) => s.settings.modes.home)
  const { updateClock, updateMode, setSection } = useStore.getState()
  const mini = (text: string, size = 1) => <span className="mini-clock" style={{ ['--k' as string]: size }}>{text}</span>
  return (
    <>
      <Section title="Clock" sub="Customize your clock and greetings."><span /></Section>
      <Card title="Clock Format" sub="Choose between 12-hour or 24-hour clock format.">
        <Choice value={c.format} onChange={(v) => updateClock({ format: v })} className="two"
          options={[{ v: '12', label: '12-hour Clock', preview: mini('2:24') }, { v: '24', label: '24-hour Clock', preview: mini('14:24') }]} />
      </Card>
      <Card title="Clock & Timer Size" sub="Applies to your clock and timer." badge="NEW">
        <Choice value={c.size} onChange={(v) => updateClock({ size: v })} className="three"
          options={[{ v: 'sm', label: 'Small', preview: mini('2:24', 0.6) }, { v: 'md', label: 'Regular', preview: mini('2:24', 1) }, { v: 'lg', label: 'Huge', preview: mini('2:24', 1.45) }]} />
      </Card>
      <Card title="Display">
        <Row label="Use flip clock" hint="Display the clock with a flip animation">
          <Toggle on={home.clockStyle === 'flip'} onChange={(v) => updateMode('home', { clockStyle: v ? 'flip' : 'classic' })} />
        </Row>
        <Row label="Show clock seconds" hint="Get a detailed time view"><Toggle on={c.seconds} onChange={(v) => updateClock({ seconds: v })} /></Row>
        {c.format === '12' && <Row label="Show AM / PM"><Toggle on={c.ampm} onChange={(v) => updateClock({ ampm: v })} /></Row>}
        <Row label="Show dynamic greetings" hint="Turn off for generic greetings"><Toggle on={c.dynamicGreeting} onChange={(v) => updateClock({ dynamicGreeting: v })} /></Row>
        <Row label="Show greetings" hint="Turn off to hide dashboard greetings"><Toggle on={home.greeting} onChange={(v) => updateMode('home', { greeting: v })} /></Row>
      </Card>
      <Card title="Clock & Timer Style" sub="The typeface for your clock and timer." badge="NEW">
        <div className="font-grid">
          {FONTS.map((f) => (
            <button key={f.v} className={`font-card cf-${f.v} ${c.font === f.v ? 'on' : ''}`} onClick={() => updateClock({ font: f.v })}>
              <span className="font-sample">12:24</span>
              <span className="choice-label">{f.label}</span>
            </button>
          ))}
        </div>
        <Row label="Layouts like Ring, Analog or Words" hint="Each mode can use its own layout"><button className="btn sm ghost" onClick={() => setSection('modes')}>Customize modes</button></Row>
      </Card>
    </>
  )
}

/* ------------------------------------------------------------ timer */

const TIMER_STYLES: ClockStyle[] = ['classic', 'flip', 'bar', 'gauge', 'dots', 'pie']
const TIMER_STYLE_LABEL: Record<string, string> = { classic: 'Default', flip: 'Flip Clock', bar: 'Progress Bar', gauge: 'Gauge', dots: 'Dot Matrix', pie: 'Pie' }

const SOUNDS: { v: AlarmSound; label: string }[] = [
  { v: 'sparkle', label: 'Sparkle' }, { v: 'bell', label: 'Bell' }, { v: 'chime', label: 'Chime' }, { v: 'marimba', label: 'Marimba' },
  { v: 'kalimba', label: 'Kalimba' }, { v: 'gong', label: 'Gong' }, { v: 'birds', label: 'Birdsong' }, { v: 'soft', label: 'Soft' },
  { v: 'digital', label: 'Digital' }, { v: 'arcade', label: 'Arcade' }, { v: 'none', label: 'None' },
]
const TALLIES: { v: TallyStyle; label: string }[] = [
  { v: 'tomatoes', label: 'Tomatoes' }, { v: 'dots', label: 'Dots' }, { v: 'stars', label: 'Stars' }, { v: 'hearts', label: 'Hearts' }, { v: 'bars', label: 'Bars' }, { v: 'numbers', label: 'Numbers' },
]

export function TimerSection() {
  const t = useStore((s) => s.settings.timer)
  const focus = useStore((s) => s.settings.modes.focus)
  const { updateTimerSettings: up, updateMode } = useStore.getState()
  const enableNotify = async (v: boolean) => {
    if (v && 'Notification' in window && Notification.permission !== 'granted') {
      const p = await Notification.requestPermission()
      if (p !== 'granted') return
    }
    up({ notify: v })
  }
  return (
    <>
      <Section title="Focus Timer" sub="Customize your timer to match your workflow."><span /></Section>
      <Card title="Timer mode">
        <Row label="Mode" hint={t.kind === 'pomodoro' ? 'Focus and breaks in cycles' : t.kind === 'countdown' ? 'One focus block, no breaks' : 'Counts up. Skip saves the session'}>
          <select value={t.kind} onChange={(e) => up({ kind: e.target.value as TimerKind })}>
            <option value="pomodoro">Pomodoro</option><option value="countdown">Countdown</option><option value="stopwatch">Stopwatch</option>
          </select>
        </Row>
        <Row label="Use Task ETA mode" hint="Focus length follows the estimate on your active task (set it in the Tasks panel)">
          <Toggle on={t.taskEta} onChange={(v) => up({ taskEta: v })} />
        </Row>
        {t.kind !== 'stopwatch' && (
          <div className="dur-grid">
            {([['focus', t.kind === 'countdown' ? 'Countdown' : 'Focus', 1, 240], ['short', 'Short Break', 1, 60], ['long', 'Long Break', 1, 90]] as const)
              .filter(([k]) => t.kind === 'pomodoro' || k === 'focus')
              .map(([k, label, min, max]) => (
                <div key={k} className={`dur dur-${k}`}>
                  <span className="muted small">{label}</span>
                  <Stepper value={t[k]} min={min} max={max} onChange={(v) => up({ [k]: v })} suffix="mins" />
                </div>
              ))}
          </div>
        )}
        {t.kind === 'pomodoro' && <Row label="Long break every" hint="Focus sessions before a long break"><Stepper value={t.longEvery} min={2} max={10} onChange={(v) => up({ longEvery: v })} /></Row>}
      </Card>

      <Card title="Timer Style" sub="Choose how the time remaining is displayed." badge="NEW">
        <div className="choice-grid three">
          {TIMER_STYLES.map((v) => (
            <button key={v} className={`choice ${focus.clockStyle === v ? 'on' : ''}`} onClick={() => updateMode('focus', { clockStyle: v })}>
              <span className="choice-art">{STYLE_PREVIEW[v]}</span>
              <span className="choice-label">{TIMER_STYLE_LABEL[v]}</span>
            </button>
          ))}
        </div>
        <Row label="Show timer progress bar" hint="A progress bar beneath the timer">
          <Toggle on={focus.progress === 'bar'} onChange={(v) => updateMode('focus', { progress: v ? 'bar' : 'ring' })} />
        </Row>
        <Row label="Show notification" hint="A desktop notification when a segment ends"><Toggle on={t.notify} onChange={(v) => void enableNotify(v)} /></Row>
        <Row label="Auto start timer on segment end" hint="Runs the full focus sequence automatically">
          <Toggle on={t.autoBreaks && t.autoFocus} onChange={(v) => up({ autoBreaks: v, autoFocus: v })} />
        </Row>
        <Row label="Show in-dashboard streak counter"><Toggle on={t.streak} onChange={(v) => up({ streak: v })} /></Row>
        <Row label="Show task in picture-in-picture" hint="The floating timer window also shows your current task"><Toggle on={t.pipTask} onChange={(v) => up({ pipTask: v })} /></Row>
        <Row label="Countdown in tab title"><Toggle on={t.tabTitle} onChange={(v) => up({ tabTitle: v })} /></Row>
      </Card>

      <Card title="Alert Sound" sub="Plays when a timer segment ends. Select to preview.">
        <Picker label="Alert sound" value={t.sound} options={SOUNDS} onChange={(v) => up({ sound: v })} onPreview={(v) => playAlarm(v, t.volume)} />
        <Row label="Alert Volume">
          <input type="range" min={0} max={1} step={0.01} value={t.volume} onChange={(e) => up({ volume: Number(e.target.value) })} style={{ ['--v' as string]: t.volume }} />
        </Row>
      </Card>

      <Card title="Session Tallies" sub="Each tally represents one complete focus session.">
        <Picker label="Tally style" value={t.tally} options={TALLIES} onChange={(v) => up({ tally: v })} />
      </Card>
    </>
  )
}

/* ----------------------------------------------------------- quotes */

export function QuotesSection() {
  const q = useStore((s) => s.settings.quotes)
  const modes = useStore((s) => s.settings.modes)
  const { updateQuotes: up, updateMode } = useStore.getState()
  const [text, setText] = useState('')
  return (
    <>
      <Section title="Quotes" sub="A line of motivation on your screen."><span /></Section>
      <Card title="Where to show quotes">
        <Row label="Show quotes"><Toggle on={q.show} onChange={(v) => up({ show: v })} /></Row>
        <Row label="Home"><Toggle on={modes.home.quote} onChange={(v) => updateMode('home', { quote: v })} /></Row>
        <Row label="Focus"><Toggle on={modes.focus.quote} onChange={(v) => updateMode('focus', { quote: v })} /></Row>
        <Row label="Ambient"><Toggle on={modes.ambient.quote} onChange={(v) => updateMode('ambient', { quote: v })} /></Row>
      </Card>
      <Card title="Look">
        <Row label="Size"><Seg value={q.size} onChange={(v) => up({ size: v })} options={[{ v: 'sm', label: 'Small' }, { v: 'md', label: 'Medium' }, { v: 'lg', label: 'Large' }]} /></Row>
        <Row label="Position">
          <select value={q.position} onChange={(e) => up({ position: e.target.value as typeof q.position })}>
            <option value="top-right">Top right</option><option value="top-left">Top left</option><option value="below-clock">Below the clock</option><option value="bottom">Bottom center</option>
          </select>
        </Row>
        <Row label="New quote">
          <select value={q.rotate} onChange={(e) => up({ rotate: Number(e.target.value) })}>
            <option value={0}>Every visit</option><option value={10}>Every 10 minutes</option><option value={30}>Every 30 minutes</option><option value={60}>Every hour</option><option value={1440}>Every day</option>
          </select>
        </Row>
        <Row label="Next quote" hint="You can also click the little arrow next to any quote"><button className="btn sm ghost" onClick={() => up({ offset: q.offset + 1 })}><RefreshCw size={13} /> Show another</button></Row>
      </Card>
      <Card title="Your quotes">
        <Row label="Only my quotes" hint={q.custom.length ? undefined : 'Add a quote below first'}><Toggle on={q.onlyCustom} onChange={(v) => up({ onlyCustom: v })} /></Row>
        <form className="inline-form" onSubmit={(e) => { e.preventDefault(); if (text.trim()) { up({ custom: [...q.custom, text.trim()] }); setText('') } }}>
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add your own quote" maxLength={160} />
          <button className="btn sm" type="submit">Add</button>
        </form>
        <ul className="quote-list">
          {q.custom.map((c, i) => (
            <li key={i}><span>“{c}”</span><button className="icon-btn ghost xs" onClick={() => up({ custom: q.custom.filter((_, j) => j !== i) })} aria-label="Remove"><Trash2 size={13} /></button></li>
          ))}
          {!q.custom.length && <li className="muted small">{QUOTES.length} built-in quotes. Yours will show up here.</li>}
        </ul>
      </Card>
    </>
  )
}

/* ----------------------------------------------------------- extras */

const KEYS: [string, string][] = [
  ['Space', 'Start / pause timer'], ['R', 'Reset timer'], ['N', 'Next session'], ['1 · 2 · 3', 'Ambient · Home · Focus'],
  ['T', 'Tasks'], ['M', 'Music'], ['J', 'Notes'], ['C', 'Customize mode'], ['F', 'Fullscreen'], [',', 'Settings'], ['Esc', 'Close'],
]
const TABS: { v: SettingsSection | 'recent'; label: string }[] = [
  { v: 'recent', label: 'Recently opened (default)' }, { v: 'themes', label: 'Themes' }, { v: 'modes', label: 'Modes' }, { v: 'clock', label: 'Clock' },
  { v: 'timer', label: 'Focus Timer' }, { v: 'stats', label: 'Stats' }, { v: 'companions', label: 'Companions' }, { v: 'music', label: 'Music' },
]

export function randomizeThemes(pool: string) {
  const list = (pool === 'all' ? LIBRARY : inCategory(pool as never)).filter((t) => t.kind !== 'youtube')
  if (!list.length) return
  const pick = () => list[Math.floor(Math.random() * list.length)].id
  const s = useStore.getState()
  s.update({ themes: { home: pick(), focus: pick(), ambient: pick() } })
}

export function ExtrasSection() {
  const s = useStore((st) => st.settings)
  const { update } = useStore.getState()
  const wake = useWakeLock()
  const perf = (patch: Partial<typeof s.perf>) => update({ perf: { ...s.perf, ...patch } })
  return (
    <>
      <Section title="Extras" sub="Advanced settings for a smoother, cleaner screen."><span /></Section>
      <Card title="Dashboard Display Name" sub="The name that appears in your Home greeting.">
        <input className="name-input" value={s.name} onChange={(e) => update({ name: e.target.value.slice(0, 24) })} placeholder="What should we call you?" />
      </Card>
      <Card title="Performance & display" sub="Tweaks for smoother running and a cleaner screen.">
        <Row label="Disable animated themes" hint="Recommended for older devices or if you notice lag. Shows a still frame instead">
          <Toggle on={s.perf.staticThemes} onChange={(v) => perf({ staticThemes: v })} />
        </Row>
        <Row label="Clear mode" hint="Hide extra UI when your mouse leaves the browser window"><Toggle on={s.perf.clearMode} onChange={(v) => perf({ clearMode: v })} /></Row>
        <Row label="Hide UI when idle" hint="In Ambient mode, controls fade after a few seconds without movement"><Toggle on={s.hideIdle} onChange={(v) => update({ hideIdle: v })} /></Row>
        <Row label="Prevent sleep" hint={<>Keep your screen from dimming or turning off. May impact battery. Status: <b>{wake}</b></>}>
          <Toggle on={s.perf.wakeLock} onChange={(v) => perf({ wakeLock: v })} />
        </Row>
      </Card>
      <Card title="Default Settings Shortcut" sub="Which tab shows when you open the Settings panel.">
        <select value={s.defaultTab} onChange={(e) => update({ defaultTab: e.target.value as typeof s.defaultTab })}>
          {TABS.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
        </select>
      </Card>
      <Card title="Theme Randomizer" sub="Show a different, random theme each time you load floe.">
        <div className="row-inline wrap">
          <select value={s.randomTheme} onChange={(e) => update({ randomTheme: e.target.value as typeof s.randomTheme })}>
            <option value="off">Disabled</option><option value="all">Any theme</option>
            {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <button className="btn sm" onClick={() => randomizeThemes(s.randomTheme === 'off' ? 'all' : s.randomTheme)}><Shuffle size={14} /> Randomize now</button>
        </div>
      </Card>
      <Card title="Logo">
        <Row label="Show logo"><Toggle on={s.showLogo} onChange={(v) => update({ showLogo: v })} /></Row>
        <Row label="Logo text"><input value={s.logoText} onChange={(e) => update({ logoText: e.target.value.slice(0, 18) })} placeholder="floe" /></Row>
      </Card>
      <Card title="Keyboard shortcuts">
        <ul className="keys">{KEYS.map(([k, d]) => <li key={k}><kbd>{k}</kbd><span>{d}</span></li>)}</ul>
      </Card>
    </>
  )
}

/* ---------------------------------------------------------- support */

export function SupportSection() {
  const [msg, setMsg] = useState('')
  useEffect(() => { /* nothing to load */ }, [])
  const body = `${msg.trim() || 'Hi! I have a question about floe focus.'}\n\n— sent from ${window.location.origin} (${navigator.userAgent.split(') ')[0]})`
  return (
    <>
      <Section title="Support" sub="Questions, ideas or something not working? The owner reads every message."><span /></Section>
      <Card title="Get in touch">
        <textarea className="support-msg" value={msg} onChange={(e) => setMsg(e.target.value)} rows={4} placeholder="Tell us what’s up…" />
        <div className="row-inline wrap">
          <a className="btn wa" href={whatsappLink(body)} target="_blank" rel="noreferrer"><WhatsAppGlyph size={16} /> WhatsApp</a>
          <a className="btn ghost" href={mailtoLink('floe focus support', body)}><Mail size={15} /> Email</a>
          <a className="btn ghost" href={mailtoLink('floe focus bug report', `What happened:\n\nWhat I expected:\n\nSteps:\n\n${body}`)}><Bug size={15} /> Report a bug</a>
        </div>
        <p className="muted small">{OWNER_EMAIL} · WhatsApp {prettyWhatsApp()}</p>
      </Card>
      <Card title="Quick answers">
        <ul className="faq-mini">
          <li><strong>My Spotify won’t connect.</strong> floe’s Spotify app is in early access, so the owner has to add your Spotify email once. Use the WhatsApp button in the Music panel.</li>
          <li><strong>The app feels slow.</strong> Turn on “Disable animated themes” in Extras, or pick a photo or gradient theme.</li>
          <li><strong>Where is my data?</strong> In your account, synced across devices. Export a backup any time in Account.</li>
          <li><strong>The floating timer button is missing.</strong> Picture-in-picture works in Chrome and Edge on desktop.</li>
        </ul>
      </Card>
    </>
  )
}

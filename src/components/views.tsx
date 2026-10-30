import { useEffect, useMemo, useState } from 'react'
import { Flame, Pause, Play, Plus, RefreshCw, RotateCcw, SkipForward, Target } from 'lucide-react'
import { durationOf, fmtTimer, MODE_LABEL, useNow, useStore, type TimerMode, type ViewMode } from '../store'
import { greeting, pickQuote } from '../lib/words'
import { extraQuotes, QUOTES, refreshExtraQuotes, type Quote } from '../lib/quotes'
import { ProgressFrame, sessionColor, Tallies, TimeDisplay, useSession } from './clocks'
import { PipButton } from './Pip'
import { useStreak } from '../lib/levels'
import { Companion } from './companions'

export { Clock, FlipCard, RollingText } from './clocks'

/* ----------------------------------------------------------------- home */

export function HomeView({ active }: { active: boolean }) {
  const name = useStore((s) => s.settings.name)
  const m = useStore((s) => s.settings.modes.home)
  const setView = useStore((s) => s.setView)
  const minute = useNow((s) => Math.floor(s.now / 60_000))
  const dynamic = useStore((s) => s.settings.clock.dynamicGreeting)
  const [l1, l2] = greeting(name, new Date(minute * 60_000), dynamic)
  const { timer, left, active: inSession } = useSession()

  return (
    <section className={`view view-home ${active ? 'active' : ''}`}>
      {m.greeting && (
        <h2 className="greet" key={l1}>
          {`${l1}\n${l2}`.split('\n').map((line, li) => (
            <span className="greet-line" key={li}>
              {line.split(' ').map((w, wi) => (
                <span className="word" key={wi} style={{ animationDelay: `${0.15 + li * 0.25 + wi * 0.06}s` }}>{w} </span>
              ))}
            </span>
          ))}
        </h2>
      )}
      <div className="stage stage-home tilt">
        <ProgressFrame kind={m.progress} clockStyle={m.clockStyle} show={inSession}
          extra={m.spot === 'beside' && <Companion id={m.companion} spot="beside" size={m.size} />}>
          <TimeDisplay style={m.clockStyle} kind="clock" />
        </ProgressFrame>
      </div>
      <div className="home-chips">
        {timer.running && (
          <button className="home-pill" onClick={() => setView('focus')}>
            <span className="pulse-dot" />
            {MODE_LABEL[timer.mode]} · {fmtTimer(left)}
          </button>
        )}
        <StreakChip />
      </div>
      <QuoteBlock view="home" inline />
    </section>
  )
}

export function StreakChip() {
  const on = useStore((s) => s.settings.timer.streak)
  const streak = useStreak()
  if (!on || streak < 1) return null
  return <span className="streak-chip" title="Days in a row with at least one focus session"><Flame size={14} /> {streak}-day streak</span>
}

/** The motivational quote. `inline` renders it in the view's own column (the "Below the clock" position). */
export function QuoteBlock({ view, inline = false }: { view: ViewMode; inline?: boolean }) {
  const q = useStore((s) => s.settings.quotes)
  const show = useStore((s) => s.settings.modes[view].quote)
  const card = useStore((s) => view === 'ambient' && s.settings.modes.ambient.timerCard)
  const updateQuotes = useStore((s) => s.updateQuotes)
  const slot = useNow((s) => Math.floor(s.now / 60_000))
  const [extra, setExtra] = useState<Quote[]>(() => extraQuotes())
  useEffect(() => { void refreshExtraQuotes().then(() => setExtra(extraQuotes())) }, [])
  const list = useMemo<Quote[]>(() => {
    const mine = q.custom.map((text) => ({ text, author: '' }))
    return q.onlyCustom && mine.length ? mine : [...QUOTES, ...extra, ...mine]
  }, [q.custom, q.onlyCustom, extra])
  const quote = pickQuote(list, q.rotate, slot * 60_000, q.offset)
  if (!q.show || !quote) return null
  // Home and Focus place a below-clock quote in their own layout; Ambient has no clock, so it sits at the bottom
  const wantsInline = q.position === 'below-clock' && view !== 'ambient'
  if (wantsInline !== inline || (inline && !show)) return null
  const pos = q.position === 'below-clock' && view === 'ambient' ? 'bottom' : q.position
  const below = card && pos === 'top-right'
  return (
    <blockquote className={`quote pos-${pos} qs-${q.size} ${show ? 'active' : ''} ${below ? 'below-card' : ''} ${inline ? 'inline' : ''}`} key={quote.text}>
      <span>“{quote.text}”</span>
      {quote.author && <cite>{quote.author}</cite>}
      <button className="quote-next" onClick={() => updateQuotes({ offset: q.offset + 1 })} aria-label="Next quote" title="Next quote"><RefreshCw size={13} /></button>
    </blockquote>
  )
}

/** Companions placed in a screen corner, rendered outside the views so nothing transforms them. */
export function CornerCompanion({ view }: { view: ViewMode }) {
  const m = useStore((s) => s.settings.modes[view])
  if (m.spot === 'beside' || m.companion === 'none') return null
  return <Companion key={view} id={m.companion} spot={m.spot} size={m.size} />
}

/* -------------------------------------------------------------- ambient */

export function TimerCard({ active }: { active: boolean }) {
  const { timer, progress, mode } = useSession()
  const m = useStore((s) => s.settings.modes.ambient)
  const { toggle, reset, skip } = useStore.getState()
  const show = active && m.timerCard
  return (
    <div
      className={`timer-card ${show ? 'active' : ''} ${timer.running ? 'running' : ''} prog-${m.progress} style-${m.clockStyle}`}
      style={{ ['--sess' as string]: sessionColor(mode, progress) }}
    >
      <div className="tc-mode">{MODE_LABEL[timer.mode]}</div>
      <div className="tc-time"><TimeDisplay style={m.clockStyle} kind="timer" /></div>
      <div className="tc-controls">
        <button className="icon-btn ghost sm" onClick={reset} aria-label="Reset"><RotateCcw size={16} /></button>
        <button className="icon-btn ghost play" onClick={toggle} aria-label={timer.running ? 'Pause' : 'Start'}>
          {timer.running ? <Pause size={22} /> : <Play size={22} />}
        </button>
        <button className="icon-btn ghost sm" onClick={skip} aria-label="Skip"><SkipForward size={16} /></button>
      </div>
      {m.progress === 'bar' && <div className="tc-progress"><div style={{ transform: `scaleX(${progress})` }} /></div>}
      {m.spot === 'beside' && <Companion id={m.companion} spot="beside" size={m.size} />}
    </div>
  )
}

/* ---------------------------------------------------------------- focus */

const MODES: TimerMode[] = ['focus', 'short', 'long']

export function FocusView({ active }: { active: boolean }) {
  const { timer, left, progress } = useSession()
  const m = useStore((s) => s.settings.modes.focus)
  const longEvery = useStore((s) => s.settings.timer.longEvery)
  const tally = useStore((s) => s.settings.timer.tally)
  const kind = useStore((s) => s.settings.timer.kind)
  const task = useStore((s) => s.tasks.find((t) => t.id === s.activeTaskId))
  const { toggle, reset, skip, setTimerMode, togglePanel } = useStore.getState()
  const idx = MODES.indexOf(timer.mode)
  const done = timer.cycle % longEvery

  return (
    <section className={`view view-focus ${active ? 'active' : ''} mode-${timer.mode}`} style={{ ['--sess' as string]: sessionColor(timer.mode, progress) }}>
      {m.modeTabs && kind === 'pomodoro' && (
        <div className="mode-tabs" style={{ ['--i' as string]: idx }}>
          <span className="mode-ind" />
          {MODES.map((x) => (
            <button key={x} className={x === timer.mode ? 'on' : ''} onClick={() => setTimerMode(x)}>{MODE_LABEL[x]}</button>
          ))}
        </div>
      )}
      <div className={`stage stage-focus tilt prog-${m.progress}`}>
        <ProgressFrame kind={m.progress} clockStyle={m.clockStyle} show
          extra={m.spot === 'beside' && <Companion id={m.companion} spot="beside" size={m.size} />}>
          <TimeDisplay style={m.clockStyle} kind="timer" />
        </ProgressFrame>
      </div>
      <div className="focus-controls">
        <button className="icon-btn glass" onClick={reset} aria-label="Reset"><RotateCcw size={18} /></button>
        <button className={`start-btn ${timer.running ? 'is-running' : ''}`} onClick={toggle}>
          <span className="start-face">{timer.running ? 'Pause' : left < durationOf(timer.mode, useStore.getState().settings.timer) ? 'Resume' : 'Start'}</span>
        </button>
        <button className="icon-btn glass" onClick={skip} aria-label={kind === 'stopwatch' ? 'Finish and save' : 'Skip'} data-tip={kind === 'stopwatch' ? 'Finish & save' : undefined}><SkipForward size={18} /></button>
        <PipButton />
      </div>
      {m.cycle && kind === 'pomodoro' && <Tallies style={tally} total={longEvery} done={done} current={timer.mode === 'focus' ? progress : 0} />}
      <StreakChip />
      {m.task && (
        <button className="focus-task" onClick={() => togglePanel('tasks')}>
          {task ? <><Target size={15} /> {task.text}</> : <><Plus size={15} /> Pick a task to focus on</>}
        </button>
      )}
      <QuoteBlock view="focus" inline />
    </section>
  )
}

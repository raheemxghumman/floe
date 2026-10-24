import { useEffect, useMemo, useState } from 'react'
import { Pause, Play, Plus, RotateCcw, SkipForward, Target } from 'lucide-react'
import { durationOf, fmtTimer, MODE_LABEL, remainingOf, useNow, useStore, type TimerMode } from '../store'
import { greeting, pickQuote } from '../lib/words'
import { extraQuotes, QUOTES, refreshExtraQuotes, type Quote } from '../lib/quotes'
import { ClockStage, Companion, RollingText, sessionColor, TomatoDots } from './clocks'

export { Clock, FlipCard, RollingText } from './clocks'

/* --------------------------------------------------------------- shared */

function useTimerView() {
  const timer = useStore((s) => s.timer)
  const t = useStore((s) => s.settings.timer)
  const now = useNow((s) => s.now)
  const left = remainingOf(timer, now)
  const total = durationOf(timer.mode, t)
  return { timer, left, total, progress: total ? 1 - left / total : 0 }
}

/* ----------------------------------------------------------------- home */

export function HomeView({ active }: { active: boolean }) {
  const name = useStore((s) => s.settings.name)
  const show = useStore((s) => s.settings.greeting)
  const setView = useStore((s) => s.setView)
  const minute = useNow((s) => Math.floor(s.now / 60_000))
  const [l1, l2] = greeting(name, new Date(minute * 60_000))
  const { timer, left } = useTimerView()

  return (
    <section className={`view view-home ${active ? 'active' : ''}`}>
      {show && (
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
      <ClockStage />
      {timer.running && (
        <button className="home-pill" onClick={() => setView('focus')}>
          <span className="pulse-dot" />
          {MODE_LABEL[timer.mode]} · {fmtTimer(left)}
        </button>
      )}
    </section>
  )
}

export function QuoteBlock({ active }: { active: boolean }) {
  const q = useStore((s) => s.settings.quotes)
  const slot = useNow((s) => Math.floor(s.now / 60_000))
  const [extra, setExtra] = useState<Quote[]>(() => extraQuotes())
  useEffect(() => { void refreshExtraQuotes().then(() => setExtra(extraQuotes())) }, [])
  const list = useMemo<Quote[]>(() => {
    const mine = q.custom.map((text) => ({ text, author: '' }))
    return q.onlyCustom && mine.length ? mine : [...QUOTES, ...extra, ...mine]
  }, [q.custom, q.onlyCustom, extra])
  const quote = pickQuote(list, q.rotate, slot * 60_000)
  if (!q.show || !quote) return null
  return (
    <blockquote className={`quote ${active ? 'active' : ''}`} key={quote.text}>
      <span>“{quote.text}”</span>
      {quote.author && <cite>{quote.author}</cite>}
    </blockquote>
  )
}

/* -------------------------------------------------------------- ambient */

export function TimerCard({ active }: { active: boolean }) {
  const { timer, left, progress } = useTimerView()
  const { toggle, reset, skip } = useStore.getState()
  return (
    <div className={`timer-card ${active ? 'active' : ''} ${timer.running ? 'running' : ''}`}>
      <div className="tc-mode">{MODE_LABEL[timer.mode]}</div>
      <div className="tc-time"><RollingText text={fmtTimer(left)} /></div>
      <div className="tc-controls">
        <button className="icon-btn ghost sm" onClick={reset} aria-label="Reset"><RotateCcw size={16} /></button>
        <button className="icon-btn ghost play" onClick={toggle} aria-label={timer.running ? 'Pause' : 'Start'}>
          {timer.running ? <Pause size={22} /> : <Play size={22} />}
        </button>
        <button className="icon-btn ghost sm" onClick={skip} aria-label="Skip"><SkipForward size={16} /></button>
      </div>
      <div className="tc-progress"><div style={{ transform: `scaleX(${progress})` }} /></div>
    </div>
  )
}

/* ---------------------------------------------------------------- focus */

const MODES: TimerMode[] = ['focus', 'short', 'long']

export function FocusView({ active }: { active: boolean }) {
  const { timer, left, progress } = useTimerView()
  const longEvery = useStore((s) => s.settings.timer.longEvery)
  const companion = useStore((s) => s.settings.companion)
  const task = useStore((s) => s.tasks.find((t) => t.id === s.activeTaskId))
  const { toggle, reset, skip, setTimerMode, togglePanel } = useStore.getState()
  const idx = MODES.indexOf(timer.mode)
  const done = timer.cycle % longEvery
  const R = 46, C = 2 * Math.PI * R
  const knob = progress * Math.PI * 2 - Math.PI / 2

  return (
    <section className={`view view-focus ${active ? 'active' : ''} mode-${timer.mode}`} style={{ ['--sess' as string]: sessionColor(timer.mode, progress) }}>
      <div className="mode-tabs" style={{ ['--i' as string]: idx }}>
        <span className="mode-ind" />
        {MODES.map((m) => (
          <button key={m} className={m === timer.mode ? 'on' : ''} onClick={() => setTimerMode(m)}>{MODE_LABEL[m]}</button>
        ))}
      </div>
      <div className="focus-stage tilt">
        <svg className="focus-ring" viewBox="0 0 100 100" aria-hidden>
          <circle cx="50" cy="50" r={R} className="ring-track" />
          <circle cx="50" cy="50" r={R} className="ring-fill" strokeDasharray={C} strokeDashoffset={C * (1 - progress)} />
          {progress > 0.001 && <circle cx={50 + Math.cos(knob + Math.PI / 2) * R} cy={50 + Math.sin(knob + Math.PI / 2) * R} r={1.8} className="ring-knob" />}
        </svg>
        <div className="focus-time"><RollingText text={fmtTimer(left)} /></div>
        {companion && <Companion />}
      </div>
      <div className="focus-controls">
        <button className="icon-btn glass" onClick={reset} aria-label="Reset"><RotateCcw size={18} /></button>
        <button className={`start-btn ${timer.running ? 'is-running' : ''}`} onClick={toggle}>
          <span className="start-face">{timer.running ? 'Pause' : left < durationOf(timer.mode, useStore.getState().settings.timer) ? 'Resume' : 'Start'}</span>
        </button>
        <button className="icon-btn glass" onClick={skip} aria-label="Skip"><SkipForward size={18} /></button>
      </div>
      <TomatoDots total={longEvery} done={done} current={timer.mode === 'focus' ? progress : 0} />
      <button className="focus-task" onClick={() => togglePanel('tasks')}>
        {task ? <><Target size={15} /> {task.text}</> : <><Plus size={15} /> Pick a task to focus on</>}
      </button>
    </section>
  )
}

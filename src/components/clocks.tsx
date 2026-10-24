import { Fragment, useEffect, useState, type ReactNode } from 'react'
import { durationOf, fmtTimer, MODE_LABEL, remainingOf, useNow, useStore, type ClockStyle, type ProgressStyle, type TimerMode } from '../store'

/* ------------------------------------------------------------- shared */

export function useSession() {
  const timer = useStore((s) => s.timer)
  const t = useStore((s) => s.settings.timer)
  const now = useNow((s) => s.now)
  const left = remainingOf(timer, now)
  const total = durationOf(timer.mode, t)
  const progress = total ? Math.min(1, Math.max(0, 1 - left / total)) : 0
  // a session is "on" while running, or paused part-way through
  const active = timer.running || left < total - 500
  return { timer, left, total, progress, active, mode: timer.mode }
}

/** Focus drifts violet → magenta → coral as it nears the end; breaks drift teal → sky. */
export function sessionColor(mode: TimerMode, p: number) {
  return mode === 'focus' ? `hsl(${265 + p * 110} 90% 66%)` : `hsl(${165 + p * 45} 75% 58%)`
}

/** Each changed character re-mounts and rolls in. */
export function RollingText({ text, className }: { text: string; className?: string }) {
  return (
    <span className={`rolling ${className ?? ''}`}>
      {text.split('').map((ch, i) => (
        <span key={`${i}-${ch}`} className={ch === ':' ? 'colon' : 'digit'}>{ch}</span>
      ))}
    </span>
  )
}

export function FlipCard({ value }: { value: string }) {
  const [cur, setCur] = useState(value)
  const [prev, setPrev] = useState(value)
  const [n, setN] = useState(0)
  useEffect(() => {
    if (value !== cur) { setPrev(cur); setCur(value); setN((k) => k + 1) }
  }, [value, cur])
  return (
    <div className="flip">
      <div className="flip-half top"><span>{cur}</span></div>
      <div className="flip-half bottom"><span>{prev}</span></div>
      {n > 0 && (
        <Fragment key={n}>
          <div className="flip-half top flap-top"><span>{prev}</span></div>
          <div className="flip-half bottom flap-bottom"><span>{cur}</span></div>
        </Fragment>
      )}
    </div>
  )
}

/* ------------------------------------------------------------ words */

const ONES = ['twelve', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven']
const SMALL = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen',
  'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen']
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']

export function numberWords(n: number): string {
  if (n < 20) return SMALL[n]
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? `-${SMALL[n % 10]}` : '')
  return `${SMALL[Math.floor(n / 100)]} hundred${n % 100 ? ` ${numberWords(n % 100)}` : ''}`
}

const minuteWords = (m: number) => (m === 15 ? 'quarter' : m === 30 ? 'half' : numberWords(m))

export function timeInWords(d: Date): string[] {
  const m = d.getMinutes()
  const h = d.getHours() % 12
  if (m === 0) return ['It’s', ONES[h], 'o’clock']
  if (m <= 30) return ['It’s', minuteWords(m), 'past', ONES[h]]
  return ['It’s', minuteWords(60 - m), 'to', ONES[(h + 1) % 12]]
}

function countdownWords(ms: number): string[] {
  const total = Math.ceil(ms / 1000)
  if (total >= 60) {
    const m = Math.ceil(total / 60)
    return [numberWords(m), m === 1 ? 'minute' : 'minutes', 'left']
  }
  return [numberWords(total), total === 1 ? 'second' : 'seconds', 'left']
}

/* ------------------------------------------------------ time display */

const pad = (n: number) => String(n).padStart(2, '0')

/**
 * Renders a time in any of the 8 styles.
 * kind="clock" shows the current time; kind="timer" shows the session countdown.
 * All sizes are in em, so the parent's font-size scales the whole display.
 */
export function TimeDisplay({ style, kind }: { style: ClockStyle; kind: 'clock' | 'timer' }) {
  const now = useNow((s) => s.now)
  const { format, seconds, ampm } = useStore((s) => s.settings.clock)
  const { left, progress, active, mode, timer } = useSession()
  const color = sessionColor(mode, progress)
  const d = new Date(now)

  let a: string, b: string, c: string | null = null, tag: string | null = null, words: string[], frac: number, sub: string
  if (kind === 'clock') {
    const h24 = d.getHours()
    a = format === '24' ? pad(h24) : String(h24 % 12 || 12)
    b = pad(d.getMinutes())
    if (seconds) c = pad(d.getSeconds())
    if (ampm && format === '12') tag = h24 < 12 ? 'AM' : 'PM'
    words = timeInWords(d)
    frac = active ? progress : (now % 60_000) / 60_000
    sub = active ? `${MODE_LABEL[mode]} · ${fmtTimer(left)} left` : d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })
  } else {
    const total = Math.ceil(left / 1000)
    const h = Math.floor(total / 3600)
    a = h ? `${h}:${pad(Math.floor((total % 3600) / 60))}` : pad(Math.floor(total / 60))
    b = pad(total % 60)
    words = countdownWords(left)
    frac = progress
    sub = MODE_LABEL[mode]
  }
  const text = `${a}:${b}`

  switch (style) {
    case 'flip':
      return (
        <div className="tdisp t-flip">
          <FlipCard value={a.padStart(2, '0')} /><FlipCard value={b} />{c && <FlipCard value={c} />}
          {tag && <span className="t-tag">{tag}</span>}
        </div>
      )
    case 'ring': {
      const R = 46, C = 2 * Math.PI * R, ang = frac * Math.PI * 2 - Math.PI / 2
      return (
        <div className="tdisp t-ring" style={{ ['--sess' as string]: active || kind === 'timer' ? color : 'rgba(255,255,255,0.85)' }}>
          <svg viewBox="0 0 100 100" aria-hidden>
            {Array.from({ length: 60 }, (_, i) => {
              const t = (i / 60) * Math.PI * 2, r1 = i % 5 === 0 ? 40.5 : 41.8
              return <line key={i} x1={50 + Math.cos(t) * r1} y1={50 + Math.sin(t) * r1} x2={50 + Math.cos(t) * 43} y2={50 + Math.sin(t) * 43} className={i % 5 === 0 ? 'tick major' : 'tick'} />
            })}
            <circle cx="50" cy="50" r={R} className="rc-track" />
            <circle cx="50" cy="50" r={R} className="rc-fill" strokeDasharray={C} strokeDashoffset={C * (1 - frac)} transform="rotate(-90 50 50)" />
            {frac > 0.001 && <circle cx={50 + Math.cos(ang) * R} cy={50 + Math.sin(ang) * R} r={2.2} className="rc-knob" />}
          </svg>
          <div className="rc-center"><span className="rc-time"><RollingText text={text} /></span><span className="rc-sub">{sub}</span></div>
        </div>
      )
    }
    case 'analog': {
      if (kind === 'timer') {
        // kitchen-timer dial: the colored wedge is the time remaining
        const rem = 1 - frac, ang = rem * 360, rad = ((ang - 90) * Math.PI) / 180
        const x = 50 + Math.cos(rad) * 40, y = 50 + Math.sin(rad) * 40
        const wedge = rem >= 0.999 ? 'M50 10 A40 40 0 1 1 49.99 10 Z' : `M50 50 L50 10 A40 40 0 ${ang > 180 ? 1 : 0} 1 ${x} ${y} Z`
        return (
          <div className="tdisp t-analog" style={{ ['--sess' as string]: color }}>
            <svg viewBox="0 0 100 100" aria-hidden>
              <circle cx="50" cy="50" r="48" className="an-face" />
              {rem > 0.001 && <path d={wedge} className="an-wedge" />}
              {Array.from({ length: 12 }, (_, i) => {
                const t = (i / 12) * Math.PI * 2
                return <line key={i} x1={50 + Math.cos(t) * 42} y1={50 + Math.sin(t) * 42} x2={50 + Math.cos(t) * 46} y2={50 + Math.sin(t) * 46} className={i % 3 === 0 ? 'an-tick major' : 'an-tick'} />
              })}
              <line x1="50" y1="50" x2={x} y2={y} className="an-min" />
              <circle cx="50" cy="50" r="3" className="an-pin" />
            </svg>
            <span className="an-readout">{text}</span>
          </div>
        )
      }
      const secs = d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds() + d.getMilliseconds() / 1000
      return (
        <div className="tdisp t-analog">
          <svg viewBox="0 0 100 100" aria-hidden>
            <circle cx="50" cy="50" r="48" className="an-face" />
            {Array.from({ length: 12 }, (_, i) => {
              const t = (i / 12) * Math.PI * 2
              return <line key={i} x1={50 + Math.cos(t) * 40} y1={50 + Math.sin(t) * 40} x2={50 + Math.cos(t) * 44} y2={50 + Math.sin(t) * 44} className={i % 3 === 0 ? 'an-tick major' : 'an-tick'} />
            })}
            <g style={{ transform: `rotate(${(secs / 120) % 360}deg)` }} className="an-hand-g"><line x1="50" y1="52" x2="50" y2="27" className="an-hour" /></g>
            <g style={{ transform: `rotate(${(secs / 10) % 360}deg)` }} className="an-hand-g"><line x1="50" y1="54" x2="50" y2="15" className="an-min" /></g>
            <g style={{ transform: `rotate(${(secs * 6) % 360}deg)` }} className="an-hand-g"><line x1="50" y1="58" x2="50" y2="11" className="an-sec" /><circle cx="50" cy="50" r="2.4" className="an-pin" /></g>
          </svg>
        </div>
      )
    }
    case 'minimal':
      return (
        <div className="tdisp t-minimal">
          <div className="tm-time"><RollingText text={text} />{c && <span className="t-sec">{c}</span>}{tag && <span className="t-tag">{tag}</span>}</div>
          <div className="tm-sub">{kind === 'clock' ? d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }) : sub}</div>
        </div>
      )
    case 'pixel':
      return (
        <div className={`tdisp t-pixel ${kind === 'timer' && !timer.running ? 'paused' : ''}`}>
          <span>{a}</span><span className="px-colon">:</span><span>{b}</span>
          {c && <span className="t-sec">{c}</span>}{tag && <span className="t-sec">{tag}</span>}
        </div>
      )
    case 'words':
      return (
        <div className="tdisp t-words" key={words.join(' ')}>
          {words.map((w, i) => <span key={i} className={kind === 'clock' && i === 0 ? 'tw-lead' : 'tw-word'} style={{ animationDelay: `${i * 0.08}s` }}>{w}</span>)}
        </div>
      )
    case 'poster':
      return (
        <div className="tdisp t-poster">
          <span className="tp-a">{a.padStart(2, '0')}</span>
          <span className="tp-b">{b}</span>
          <span className="tp-side">{kind === 'clock' ? d.toLocaleDateString(undefined, { weekday: 'long' }) : sub}{tag ? ` · ${tag}` : ''}</span>
        </div>
      )
    default:
      return <div className={`tdisp t-classic kind-${kind}`}><RollingText text={text} />{c && <span className="t-sec">{c}</span>}{tag && <span className="t-tag">{tag}</span>}</div>
  }
}

/** Kept for the landing page and anything that just wants "the clock". */
export function Clock() {
  const style = useStore((s) => s.settings.modes.home.clockStyle)
  return <TimeDisplay style={style} kind="clock" />
}

/* ------------------------------------------------- session progress */

/** Styles that already draw their own progress, so an extra ring/orbit would double up. */
const SELF_PROGRESS: ClockStyle[] = ['ring', 'analog']

/**
 * Wraps a time display with the chosen progress visual.
 * `show` lets Home hide it between sessions; Focus always shows it.
 */
export function ProgressFrame({ kind, clockStyle, show, children, extra }: {
  kind: ProgressStyle; clockStyle: ClockStyle; show: boolean; children: ReactNode; extra?: ReactNode
}) {
  const { progress, mode, left } = useSession()
  const color = sessionColor(mode, progress)
  const effective = SELF_PROGRESS.includes(clockStyle) && (kind === 'ring' || kind === 'orbit') ? 'off' : kind
  const on = show && effective !== 'off'
  const R = 46, C = 2 * Math.PI * R
  const a = progress * Math.PI * 2 - Math.PI / 2

  return (
    <div className={`pframe ${on ? `prog-${effective}` : ''} style-${clockStyle}`} style={{ ['--sess' as string]: color, ['--p' as string]: progress }}>
      {on && effective === 'glow' && <div className="sess-glow" aria-hidden />}
      {on && (effective === 'orbit' || effective === 'ring') && (
        <div className={effective === 'orbit' ? 'orbit' : 'pring'} aria-hidden>
          <svg viewBox="0 0 100 100">
            <circle cx="50" cy="50" r={R} className="orbit-track" />
            <circle cx="50" cy="50" r={R} className="orbit-fill" strokeDasharray={C} strokeDashoffset={C * (1 - progress)} transform="rotate(-90 50 50)" />
            {progress > 0.001 && <circle cx={50 + Math.cos(a) * R} cy={50 + Math.sin(a) * R} r={effective === 'orbit' ? 2.6 : 1.9} className="orbit-knob" />}
          </svg>
        </div>
      )}
      <div className="pframe-time">{children}</div>
      {on && effective === 'bar' && (
        <div className="sess-bar">
          <div className="sess-bar-track"><div style={{ transform: `scaleX(${progress})` }} /></div>
          <span>{MODE_LABEL[mode]} · {fmtTimer(left)} left · {Math.round(progress * 100)}%</span>
        </div>
      )}
      {extra}
    </div>
  )
}

/** Cycle indicator as little tomatoes: full = done, half = in progress, outline = to go. */
export function TomatoDots({ total, done, current }: { total: number; done: number; current: number }) {
  return (
    <div className="tomato-dots" title={`${done} of ${total} before a long break`}>
      {Array.from({ length: total }, (_, i) => {
        const fill = i < done ? 1 : i === done ? current : 0
        return (
          <svg key={i} viewBox="0 0 24 24" className={`td ${i < done ? 'done' : ''}`}>
            <defs><clipPath id={`tdc${i}`}><rect x="0" y={24 - 24 * fill} width="24" height="24" /></clipPath></defs>
            <circle cx="12" cy="14" r="8.5" className="td-outline" />
            <circle cx="12" cy="14" r="8.5" className="td-fill" clipPath={`url(#tdc${i})`} />
            <path d="M12 6 l-3 -2 l2 3 l-4 1 l4 1 l1 2 l1 -2 l4 -1 l-4 -1 l2 -3 z" className="td-leaf" />
          </svg>
        )
      })}
    </div>
  )
}

export const CLOCK_STYLES: { v: ClockStyle; label: string }[] = [
  { v: 'classic', label: 'Classic' }, { v: 'flip', label: 'Flip' }, { v: 'ring', label: 'Ring' }, { v: 'analog', label: 'Analog' },
  { v: 'minimal', label: 'Minimal' }, { v: 'pixel', label: 'Pixel' }, { v: 'words', label: 'Words' }, { v: 'poster', label: 'Poster' },
]

export const PROGRESS_OPTIONS: Record<'home' | 'focus' | 'ambient', { v: ProgressStyle; label: string }[]> = {
  home: [{ v: 'orbit', label: 'Orbit' }, { v: 'bar', label: 'Bar' }, { v: 'glow', label: 'Glow' }, { v: 'off', label: 'Off' }],
  focus: [{ v: 'ring', label: 'Ring' }, { v: 'orbit', label: 'Orbit' }, { v: 'bar', label: 'Bar' }, { v: 'glow', label: 'Glow' }, { v: 'off', label: 'Off' }],
  ambient: [{ v: 'bar', label: 'Bar' }, { v: 'glow', label: 'Glow' }, { v: 'off', label: 'Off' }],
}

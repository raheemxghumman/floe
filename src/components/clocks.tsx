import { Fragment, useEffect, useState } from 'react'
import { durationOf, fmtTimer, MODE_LABEL, remainingOf, useNow, useStore, type ClockStyle, type TimerMode } from '../store'

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

function clockParts(d: Date, fmt: '12' | '24') {
  const h24 = d.getHours()
  const h = fmt === '24' ? String(h24).padStart(2, '0') : String(h24 % 12 || 12)
  return { h, h24, m: String(d.getMinutes()).padStart(2, '0'), s: String(d.getSeconds()).padStart(2, '0'), ampm: h24 < 12 ? 'AM' : 'PM' }
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
const NUM = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen',
  'fourteen', 'quarter', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty']
const minuteWords = (m: number) => (m <= 20 ? NUM[m] : m === 30 ? 'half' : `twenty-${NUM[m - 20]}`)

export function timeInWords(d: Date): string[] {
  const m = d.getMinutes()
  const h = d.getHours() % 12
  if (m === 0) return ['It’s', ONES[h], 'o’clock']
  if (m <= 30) return ['It’s', minuteWords(m), 'past', ONES[h]]
  return ['It’s', minuteWords(60 - m), 'to', ONES[(h + 1) % 12]]
}

/* ----------------------------------------------------------- styles */

function RingClock({ d, fmt }: { d: Date; fmt: '12' | '24' }) {
  const { active, progress, mode, left } = useSession()
  const ms = useNow((s) => s.now % 60_000)
  const p = active ? progress : ms / 60_000
  const color = active ? sessionColor(mode, progress) : 'rgba(255,255,255,0.85)'
  const R = 46, C = 2 * Math.PI * R
  const a = p * Math.PI * 2 - Math.PI / 2
  const t = clockParts(d, fmt)
  return (
    <div className="ring-clock tilt" style={{ ['--sess' as string]: color }}>
      <svg viewBox="0 0 100 100" aria-hidden>
        {Array.from({ length: 60 }, (_, i) => {
          const ang = (i / 60) * Math.PI * 2
          const r1 = i % 5 === 0 ? 40.5 : 41.8
          return <line key={i} x1={50 + Math.cos(ang) * r1} y1={50 + Math.sin(ang) * r1} x2={50 + Math.cos(ang) * 43} y2={50 + Math.sin(ang) * 43} className={i % 5 === 0 ? 'tick major' : 'tick'} />
        })}
        <circle cx="50" cy="50" r={R} className="rc-track" />
        <circle cx="50" cy="50" r={R} className="rc-fill" strokeDasharray={C} strokeDashoffset={C * (1 - p)} transform="rotate(-90 50 50)" />
        <circle cx={50 + Math.cos(a) * R} cy={50 + Math.sin(a) * R} r={2.2} className="rc-knob" />
      </svg>
      <div className="rc-center">
        <span className="rc-time">{t.h}:{t.m}</span>
        <span className="rc-sub">{active ? `${MODE_LABEL[mode]} · ${fmtTimer(left)} left` : d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })}</span>
      </div>
    </div>
  )
}

function AnalogClock() {
  const ms = useNow((s) => s.now)
  const local = new Date(ms)
  const secs = local.getHours() * 3600 + local.getMinutes() * 60 + local.getSeconds() + local.getMilliseconds() / 1000
  return (
    <div className="analog tilt">
      <svg viewBox="0 0 100 100" aria-hidden>
        <circle cx="50" cy="50" r="48" className="an-face" />
        {Array.from({ length: 12 }, (_, i) => {
          const ang = (i / 12) * Math.PI * 2
          return <line key={i} x1={50 + Math.cos(ang) * 40} y1={50 + Math.sin(ang) * 40} x2={50 + Math.cos(ang) * 44} y2={50 + Math.sin(ang) * 44} className={i % 3 === 0 ? 'an-tick major' : 'an-tick'} />
        })}
        <g style={{ transform: `rotate(${(secs / 120) % 360}deg)` }} className="an-hand-g"><line x1="50" y1="52" x2="50" y2="27" className="an-hour" /></g>
        <g style={{ transform: `rotate(${(secs / 10) % 360}deg)` }} className="an-hand-g"><line x1="50" y1="54" x2="50" y2="15" className="an-min" /></g>
        <g style={{ transform: `rotate(${(secs * 6) % 360}deg)` }} className="an-hand-g sec"><line x1="50" y1="58" x2="50" y2="11" className="an-sec" /><circle cx="50" cy="50" r="2.4" className="an-pin" /></g>
      </svg>
    </div>
  )
}

export function Clock() {
  const sec = useNow((s) => Math.floor(s.now / 1000))
  const { format, seconds, ampm, style } = useStore((s) => s.settings.clock)
  const d = new Date(sec * 1000)
  const p = clockParts(d, format)
  const showAmpm = ampm && format === '12'
  const extras = <>{seconds && <span className="clock-sec">{p.s}</span>}{showAmpm && <span className="clock-ampm">{p.ampm}</span>}</>

  switch (style as ClockStyle) {
    case 'flip':
      return (
        <div className="flip-clock">
          <FlipCard value={p.h.padStart(2, '0')} />
          <FlipCard value={p.m} />
          {seconds && <FlipCard value={p.s} />}
          {showAmpm && <span className="flip-ampm">{p.ampm}</span>}
        </div>
      )
    case 'ring': return <RingClock d={d} fmt={format} />
    case 'analog': return <AnalogClock />
    case 'minimal':
      return (
        <div className="clock-minimal">
          <div className="cm-time"><RollingText text={`${p.h}:${p.m}`} />{extras}</div>
          <div className="cm-date">{d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</div>
        </div>
      )
    case 'pixel':
      return (
        <div className="clock-pixel tilt">
          <span>{p.h}</span><span className="px-colon">:</span><span>{p.m}</span>
          {seconds && <span className="px-sec">{p.s}</span>}
          {showAmpm && <span className="px-sec">{p.ampm}</span>}
        </div>
      )
    case 'words': {
      const words = timeInWords(d)
      return (
        <div className="clock-words" key={words.join(' ')}>
          {words.map((w, i) => <span key={i} className={i === 0 ? 'cw-lead' : 'cw-word'} style={{ animationDelay: `${i * 0.08}s` }}>{w}</span>)}
        </div>
      )
    }
    case 'poster':
      return (
        <div className="clock-poster tilt">
          <span className="cp-h">{p.h.padStart(2, '0')}</span>
          <span className="cp-m">{p.m}</span>
          <span className="cp-day">{d.toLocaleDateString(undefined, { weekday: 'long' })}{showAmpm ? ` · ${p.ampm}` : ''}</span>
        </div>
      )
    default:
      return <div className="clock tilt"><RollingText text={`${p.h}:${p.m}`} />{extras}</div>
  }
}

/* ------------------------------------------------- session progress */

/** Wraps the Home clock with a live view of the current session. */
export function ClockStage() {
  const style = useStore((s) => s.settings.clock.style)
  const kind = useStore((s) => s.settings.clock.progress)
  const { active, progress, mode, left } = useSession()
  const color = sessionColor(mode, progress)
  const R = 46, C = 2 * Math.PI * R
  const a = progress * Math.PI * 2 - Math.PI / 2
  const on = active && kind !== 'off' && style !== 'ring'

  return (
    <div className={`clock-stage ${on ? `prog-${kind}` : ''}`} style={{ ['--sess' as string]: color, ['--p' as string]: progress }}>
      {on && kind === 'glow' && <div className="sess-glow" aria-hidden />}
      {on && kind === 'ring' && (
        <div className="orbit" aria-hidden>
          <svg viewBox="0 0 100 100">
            <circle cx="50" cy="50" r={R} className="orbit-track" />
            <circle cx="50" cy="50" r={R} className="orbit-fill" strokeDasharray={C} strokeDashoffset={C * (1 - progress)} transform="rotate(-90 50 50)" />
            <circle cx={50 + Math.cos(a) * R} cy={50 + Math.sin(a) * R} r={2.6} className="orbit-knob" />
          </svg>
        </div>
      )}
      <Clock />
      {on && kind === 'bar' && (
        <div className="sess-bar">
          <div className="sess-bar-track"><div style={{ transform: `scaleX(${progress})` }} /></div>
          <span>{MODE_LABEL[mode]} · {fmtTimer(left)} left · {Math.round(progress * 100)}%</span>
        </div>
      )}
    </div>
  )
}

/* -------------------------------------------------------- companion */

/** A little tomato that works while you focus and kicks back on breaks. */
export function Companion() {
  const { timer, active } = useSession()
  const state = timer.running ? (timer.mode === 'focus' ? 'work' : 'rest') : active ? 'pause' : 'idle'
  return (
    <div className={`companion st-${state}`} aria-hidden title={state === 'work' ? 'Working hard' : state === 'rest' ? 'Taking a break' : 'Ready when you are'}>
      <svg viewBox="0 0 160 150">
        <ellipse cx="80" cy="140" rx="46" ry="6" className="cp-shadow" />
        {state === 'rest' && (
          <g className="beanbag"><ellipse cx="80" cy="122" rx="60" ry="22" /><ellipse cx="80" cy="112" rx="44" ry="16" className="bb-top" /></g>
        )}
        <g className="cp-body">
          <ellipse cx="80" cy="82" rx="46" ry="42" className="tm-skin" />
          <ellipse cx="80" cy="96" rx="40" ry="26" className="tm-shade" />
          <ellipse cx="62" cy="62" rx="11" ry="7" className="tm-hi" transform="rotate(-25 62 62)" />
          <path d="M80 44 l-14 -6 l10 10 l-18 2 l18 4 l-8 10 l12 -8 l12 8 l-8 -10 l18 -4 l-18 -2 l10 -10 z" className="tm-leaf" />
          <path d="M80 44 q2 -10 8 -14" className="tm-stem" />
          <g className="cp-face">
            <g className="cp-eyes">
              {state === 'rest'
                ? <><path d="M62 80 q6 -6 12 0" className="eye-closed" /><path d="M86 80 q6 -6 12 0" className="eye-closed" /></>
                : <><ellipse cx="68" cy="80" rx="4.6" ry="6" className="eye" /><ellipse cx="92" cy="80" rx="4.6" ry="6" className="eye" /><circle cx="69.6" cy="77.6" r="1.6" className="glint" /><circle cx="93.6" cy="77.6" r="1.6" className="glint" /></>}
            </g>
            <g className="glasses"><circle cx="68" cy="80" r="10" /><circle cx="92" cy="80" r="10" /><path d="M78 80 h4" /></g>
            <ellipse cx="56" cy="94" rx="6" ry="3.4" className="cheek" /><ellipse cx="104" cy="94" rx="6" ry="3.4" className="cheek" />
            <path d={state === 'work' ? 'M74 98 q6 3 12 0' : 'M72 96 q8 8 16 0'} className="mouth" />
          </g>
        </g>
        {state === 'work' && (
          <g className="laptop">
            <path d="M44 118 h72 l8 12 h-88 z" className="lp-base" />
            <path d="M52 86 h56 v32 h-56 z" className="lp-screen" />
            <circle cx="80" cy="102" r="3" className="lp-logo" />
            <circle cx="62" cy="122" r="6" className="hand h1" /><circle cx="98" cy="122" r="6" className="hand h2" />
          </g>
        )}
        {state === 'rest' && (
          <g className="mug">
            <path d="M96 100 h20 v18 a6 6 0 0 1 -6 6 h-8 a6 6 0 0 1 -6 -6 z" className="mug-cup" />
            <path d="M116 104 q8 0 8 6 q0 6 -8 6" className="mug-handle" />
            <path d="M102 94 q-4 -6 0 -12 q4 -6 0 -12" className="steam s1" />
            <path d="M110 94 q-4 -6 0 -12 q4 -6 0 -12" className="steam s2" />
            <circle cx="94" cy="112" r="6" className="hand" />
          </g>
        )}
        {(state === 'idle' || state === 'pause') && <circle cx="126" cy="76" r="7" className="hand wave" />}
        {state === 'pause' && <text x="118" y="44" className="zz">…</text>}
      </svg>
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

import { useMemo, useState } from 'react'
import { Coffee, ListChecks, Timer } from 'lucide-react'
import { useStore, type Session } from '../../store'
import { Seg } from './controls'

const DAY = 86_400_000
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
const startOfDay = (t: number) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d }

export function fmtMins(m: number) {
  const h = Math.floor(m / 60)
  const r = Math.round(m % 60)
  if (!h) return `${r}m`
  return r ? `${h}h ${r}m` : `${h}h`
}

function byDay(sessions: Session[]) {
  const map = new Map<string, { mins: number; count: number }>()
  for (const s of sessions) {
    if (s.type !== 'focus') continue
    const k = dayKey(new Date(s.at))
    const v = map.get(k) ?? { mins: 0, count: 0 }
    v.mins += s.minutes; v.count += 1
    map.set(k, v)
  }
  return map
}

/* ------------------------------------------------------------ heatmap */

// One hue, dark → bright on the dark surface (sequential).
const LEVELS = ['rgba(255,255,255,0.06)', '#3a2878', '#5530c0', '#7432ff', '#b39dff']

function Heatmap({ days, metric, weeks }: { days: Map<string, { mins: number; count: number }>; metric: 'hours' | 'sessions'; weeks: number }) {
  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null)
  const today = startOfDay(Date.now())
  const end = new Date(today.getTime() + (6 - today.getDay()) * DAY)
  const start = new Date(end.getTime() - (weeks * 7 - 1) * DAY)

  const cells = useMemo(() => {
    const out: { d: Date; v: number; future: boolean }[] = []
    for (let i = 0; i < weeks * 7; i++) {
      const d = new Date(start.getTime() + i * DAY + 3_600_000 * 2)
      d.setHours(0, 0, 0, 0)
      const e = days.get(dayKey(d))
      out.push({ d, v: e ? (metric === 'hours' ? e.mins : e.count) : 0, future: d > today })
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, metric, weeks, today.getTime()])

  const max = Math.max(0, ...cells.map((c) => c.v))
  const level = (v: number) => (v <= 0 || !max ? 0 : Math.min(4, Math.ceil((v / max) * 4)))
  const months: { col: number; label: string }[] = []
  for (let w = 0; w < weeks; w++) {
    const d = cells[w * 7].d
    if (d.getDate() <= 7) months.push({ col: w, label: MONTHS[d.getMonth()] })
  }

  return (
    <div className="heat-wrap" onPointerLeave={() => setTip(null)}>
      <div className="heat-months" style={{ gridTemplateColumns: `repeat(${weeks}, 1fr)` }}>
        {months.map((m) => <span key={m.col} style={{ gridColumn: m.col + 1 }}>{m.label}</span>)}
      </div>
      <div className="heat" style={{ gridTemplateColumns: `repeat(${weeks}, 1fr)` }}>
        {cells.map((c, i) => (
          <span
            key={i}
            className={`heat-cell ${c.future ? 'future' : ''}`}
            style={{ background: c.future ? 'transparent' : LEVELS[level(c.v)], gridRow: (i % 7) + 1, gridColumn: Math.floor(i / 7) + 1 }}
            onPointerEnter={(e) => {
              if (c.future) return
              const r = (e.target as HTMLElement).getBoundingClientRect()
              const p = (e.currentTarget.closest('.heat-wrap') as HTMLElement).getBoundingClientRect()
              const val = metric === 'hours' ? (c.v ? fmtMins(c.v) : 'No focus') : `${c.v} session${c.v === 1 ? '' : 's'}`
              setTip({ x: r.left - p.left + r.width / 2, y: r.top - p.top, text: `${val} · ${c.d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', weekday: 'short' })}` })
            }}
          />
        ))}
      </div>
      {tip && <div className="chart-tip" style={{ left: tip.x, top: tip.y }}>{tip.text}</div>}
      <div className="heat-foot">
        <span className="muted small">{start.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
        <span className="heat-legend">
          <span className="muted small">Less</span>
          {LEVELS.map((c) => <i key={c} style={{ background: c }} />)}
          <span className="muted small">More</span>
        </span>
        <span className="muted small">{today.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------- trend */

function smoothPath(pts: [number, number][]) {
  if (pts.length < 2) return ''
  let d = `M${pts[0][0]},${pts[0][1]}`
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[Math.max(0, i - 1)]
    const [x1, y1] = pts[i]
    const [x2, y2] = pts[i + 1]
    const [x3, y3] = pts[Math.min(pts.length - 1, i + 2)]
    const t = 0.18
    d += ` C${x1 + (x2 - x0) * t},${y1 + (y2 - y0) * t} ${x2 - (x3 - x1) * t},${y2 - (y3 - y1) * t} ${x2},${y2}`
  }
  return d
}

function Trend({ days, span }: { days: Map<string, { mins: number; count: number }>; span: 'daily' | 'weekly' }) {
  const [hover, setHover] = useState<number | null>(null)
  const today = startOfDay(Date.now())
  const data = useMemo(() => {
    if (span === 'daily') {
      return Array.from({ length: 14 }, (_, i) => {
        const d = new Date(today.getTime() - (13 - i) * DAY + 7_200_000); d.setHours(0, 0, 0, 0)
        return { label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), v: days.get(dayKey(d))?.mins ?? 0 }
      })
    }
    return Array.from({ length: 12 }, (_, i) => {
      const startW = new Date(today.getTime() - (today.getDay() + (11 - i) * 7) * DAY + 7_200_000); startW.setHours(0, 0, 0, 0)
      let v = 0
      for (let k = 0; k < 7; k++) {
        const d = new Date(startW.getTime() + k * DAY + 7_200_000); d.setHours(0, 0, 0, 0)
        v += days.get(dayKey(d))?.mins ?? 0
      }
      return { label: startW.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), v }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, span, today.getTime()])

  const W = 600, H = 220, P = { l: 12, r: 12, t: 28, b: 28 }
  const max = Math.max(60, ...data.map((d) => d.v))
  const x = (i: number) => P.l + (i / (data.length - 1)) * (W - P.l - P.r)
  const y = (v: number) => H - P.b - (v / max) * (H - P.t - P.b)
  const pts = data.map((d, i) => [x(i), y(d.v)] as [number, number])
  const line = smoothPath(pts)
  const area = `${line} L${x(data.length - 1)},${H - P.b} L${x(0)},${H - P.b} Z`
  const peak = data.reduce((m, d, i) => (d.v > data[m].v ? i : m), 0)
  const labelled = new Set([peak, data.length - 1])
  const empty = data.every((d) => d.v === 0)

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - r.left) / r.width) * W
    let best = 0
    data.forEach((_, i) => { if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i })
    setHover(best)
  }

  return (
    <div className="trend">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Focus time trend">
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#7432ff" stopOpacity="0.35" />
            <stop offset="1" stopColor="#7432ff" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f} x1={P.l} x2={W - P.r} y1={y(max * f)} y2={y(max * f)} className="grid-line" />
        ))}
        <line x1={P.l} x2={W - P.r} y1={H - P.b} y2={H - P.b} className="axis-line" />
        <path d={area} fill="url(#trendFill)" className="trend-area" />
        <path d={line} className="trend-line" pathLength={1} />
        {pts.map(([px, py], i) => labelled.has(i) && data[i].v > 0 && (
          <g key={i}>
            <circle cx={px} cy={py} r={4} className="trend-dot" />
            <text x={px} y={py - 12} textAnchor={i === data.length - 1 ? 'end' : 'middle'} className="trend-label">{fmtMins(data[i].v)}</text>
          </g>
        ))}
        {data.map((d, i) => (i % Math.ceil(data.length / 6) === 0 || i === data.length - 1) && (
          <text key={i} x={x(i)} y={H - 8} textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'} className="axis-label">{d.label}</text>
        ))}
        {hover !== null && (
          <g pointerEvents="none">
            <line x1={x(hover)} x2={x(hover)} y1={P.t - 10} y2={H - P.b} className="crosshair" />
            <circle cx={x(hover)} cy={y(data[hover].v)} r={5} className="trend-dot hover" />
          </g>
        )}
        <rect x={0} y={0} width={W} height={H} fill="transparent" onPointerMove={onMove} onPointerLeave={() => setHover(null)} />
      </svg>
      {hover !== null && (
        <div className="chart-tip" style={{ left: `${(x(hover) / W) * 100}%`, top: `${(y(data[hover].v) / H) * 100}%` }}>
          <strong>{fmtMins(data[hover].v)}</strong> · {span === 'weekly' ? `week of ${data[hover].label}` : data[hover].label}
        </div>
      )}
      {empty && <div className="chart-empty">Finish your first focus session and your trend starts here.</div>}
    </div>
  )
}

/* ------------------------------------------------------------ section */

export function StatsSection() {
  const sessions = useStore((s) => s.sessions)
  const tasksCompleted = useStore((s) => s.tasksCompleted)
  const [metric, setMetric] = useState<'hours' | 'sessions'>('hours')
  const [weeks, setWeeks] = useState<'26' | '53'>('26')
  const [span, setSpan] = useState<'daily' | 'weekly'>('daily')
  const days = useMemo(() => byDay(sessions), [sessions])

  const focus = sessions.filter((s) => s.type === 'focus')
  const breakMins = sessions.filter((s) => s.type !== 'focus').reduce((a, s) => a + s.minutes, 0)
  const todayK = dayKey(new Date())
  const today = days.get(todayK) ?? { mins: 0, count: 0 }
  const weekStart = startOfDay(Date.now() - new Date().getDay() * DAY).getTime()
  const weekMins = focus.filter((s) => s.at >= weekStart).reduce((a, s) => a + s.minutes, 0)
  // consecutive days with focus, counting back from today (an empty today doesn't break it)
  let streak = 0
  const cursor = startOfDay(Date.now())
  for (let i = 0; i < 3650; i++) {
    const k = dayKey(cursor)
    if (days.has(k)) streak++
    else if (k !== todayK) break
    cursor.setDate(cursor.getDate() - 1)
  }

  return (
    <div className="stats">
      <div className="stat-cards">
        <div className="stat-card green"><div className="sc-head">Tasks Completed <ListChecks size={18} /></div><div className="sc-val">{tasksCompleted}</div></div>
        <div className="stat-card blue"><div className="sc-head">Sessions <Timer size={18} /></div><div className="sc-val">{focus.length}</div></div>
        <div className="stat-card pink"><div className="sc-head">Break Time <Coffee size={18} /></div><div className="sc-val">{fmtMins(breakMins)}</div></div>
      </div>

      <div className="stat-strip">
        <div><span className="muted small">Today</span><strong>{fmtMins(today.mins)}</strong><span className="muted small">{today.count} sessions</span></div>
        <div><span className="muted small">This week</span><strong>{fmtMins(weekMins)}</strong></div>
        <div><span className="muted small">Streak</span><strong>{streak} day{streak === 1 ? '' : 's'}</strong></div>
        <div><span className="muted small">All time</span><strong>{fmtMins(focus.reduce((a, s) => a + s.minutes, 0))}</strong></div>
      </div>

      <div className="stat-panel">
        <h3>Focus Calendar</h3>
        <div className="stat-filters">
          <Seg value={metric} onChange={setMetric} options={[{ v: 'hours', label: 'Hours' }, { v: 'sessions', label: 'Sessions' }]} />
          <Seg value={weeks} onChange={setWeeks} options={[{ v: '26', label: '6 months' }, { v: '53', label: '1 year' }]} />
        </div>
        <Heatmap days={days} metric={metric} weeks={Number(weeks)} />
      </div>

      <div className="stat-panel">
        <h3>Focus Trend</h3>
        <div className="stat-filters">
          <Seg value={span} onChange={setSpan} options={[{ v: 'daily', label: '14 days' }, { v: 'weekly', label: '12 weeks' }]} />
        </div>
        <Trend days={days} span={span} />
      </div>
    </div>
  )
}

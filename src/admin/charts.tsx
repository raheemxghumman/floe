import { useId, useState } from 'react'

export interface Point { label: string; value: number; full?: string }

const W = 640, H = 220, P = { l: 36, r: 12, t: 16, b: 26 }

function niceMax(v: number) {
  if (v <= 0) return 4
  const p = 10 ** Math.floor(Math.log10(v))
  return Math.ceil(v / p / 2) * 2 * p
}

function Axes({ max, fmt, data, x }: { max: number; fmt: (n: number) => string; data: Point[]; x: (i: number) => number }) {
  const y = (v: number) => H - P.b - (v / max) * (H - P.t - P.b)
  const every = Math.max(1, Math.ceil(data.length / 7))
  return (
    <>
      {[0, 0.5, 1].map((f) => (
        <g key={f}>
          <line x1={P.l} x2={W - P.r} y1={y(max * f)} y2={y(max * f)} className={f === 0 ? 'ax-base' : 'ax-grid'} />
          <text x={P.l - 8} y={y(max * f) + 4} textAnchor="end" className="ax-label">{fmt(max * f)}</text>
        </g>
      ))}
      {data.map((d, i) => (i % every === 0 || i === data.length - 1) && (
        <text key={i} x={x(i)} y={H - 6} textAnchor="middle" className="ax-label">{d.label}</text>
      ))}
    </>
  )
}

function Tip({ x, y, d, fmt }: { x: number; y: number; d: Point; fmt: (n: number) => string }) {
  return (
    <div className="chart-tip" style={{ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%` }}>
      <strong>{fmt(d.value)}</strong> · {d.full ?? d.label}
    </div>
  )
}

export function BarChart({ data, fmt = (n) => String(Math.round(n)), color = '#9b6bff' }: { data: Point[]; fmt?: (n: number) => string; color?: string }) {
  const [hover, setHover] = useState<number | null>(null)
  const max = niceMax(Math.max(...data.map((d) => d.value), 0))
  const slot = (W - P.l - P.r) / Math.max(1, data.length)
  const bw = Math.max(2, Math.min(28, slot - 2))
  const x = (i: number) => P.l + slot * i + slot / 2
  const y = (v: number) => H - P.b - (v / max) * (H - P.t - P.b)
  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" onPointerLeave={() => setHover(null)}>
        <Axes max={max} fmt={fmt} data={data} x={x} />
        {data.map((d, i) => {
          const top = y(d.value)
          const h = H - P.b - top
          return (
            <g key={i} onPointerEnter={() => setHover(i)}>
              <rect x={x(i) - slot / 2} y={P.t} width={slot} height={H - P.t - P.b} fill="transparent" />
              {h > 0 && <rect x={x(i) - bw / 2} y={top} width={bw} height={h} rx={Math.min(4, bw / 2)} fill={color} opacity={hover === null || hover === i ? 1 : 0.45} className="bar" style={{ ['--d' as string]: `${i * 12}ms` }} />}
            </g>
          )
        })}
      </svg>
      {hover !== null && <Tip x={x(hover)} y={y(data[hover].value)} d={data[hover]} fmt={fmt} />}
    </div>
  )
}

export function LineChart({ data, fmt = (n) => String(Math.round(n)), color = '#9b6bff' }: { data: Point[]; fmt?: (n: number) => string; color?: string }) {
  const [hover, setHover] = useState<number | null>(null)
  const gid = 'g' + useId().replace(/[^a-zA-Z0-9]/g, '')
  const max = niceMax(Math.max(...data.map((d) => d.value), 0))
  const x = (i: number) => P.l + (i / Math.max(1, data.length - 1)) * (W - P.l - P.r)
  const y = (v: number) => H - P.b - (v / max) * (H - P.t - P.b)
  const pts = data.map((d, i) => `${x(i)},${y(d.value)}`).join(' ')
  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - r.left) / r.width) * W
    let best = 0
    data.forEach((_, i) => { if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i })
    setHover(best)
  }
  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity="0.32" />
            <stop offset="1" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <Axes max={max} fmt={fmt} data={data} x={x} />
        {data.length > 1 && <polygon points={`${x(0)},${H - P.b} ${pts} ${x(data.length - 1)},${H - P.b}`} fill={`url(#${gid})`} className="area" />}
        <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" className="line" pathLength={1} />
        {hover !== null && (
          <g pointerEvents="none">
            <line x1={x(hover)} x2={x(hover)} y1={P.t} y2={H - P.b} className="crosshair" />
            <circle cx={x(hover)} cy={y(data[hover].value)} r={5} fill="#fff" stroke={color} strokeWidth={2} />
          </g>
        )}
        <rect x={P.l} y={0} width={W - P.l - P.r} height={H} fill="transparent" onPointerMove={onMove} onPointerLeave={() => setHover(null)} />
      </svg>
      {hover !== null && <Tip x={x(hover)} y={y(data[hover].value)} d={data[hover]} fmt={fmt} />}
    </div>
  )
}

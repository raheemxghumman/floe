import type { ReactNode } from 'react'
import { Minus, Plus } from 'lucide-react'

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} className={`switch ${on ? 'on' : ''}`} onClick={() => onChange(!on)}>
      <span />
    </button>
  )
}

export function Row({ label, hint, children }: { label: ReactNode; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="s-row">
      <div className="s-row-text">
        <div className="s-row-label">{label}</div>
        {hint && <div className="s-row-hint">{hint}</div>}
      </div>
      <div className="s-row-ctrl">{children}</div>
    </div>
  )
}

export function Stepper({ value, min, max, onChange, suffix }: { value: number; min: number; max: number; onChange: (v: number) => void; suffix?: string }) {
  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v)))
  return (
    <div className="stepper">
      <button onClick={() => onChange(clamp(value - 1))} aria-label="Decrease"><Minus size={14} /></button>
      <input
        type="number" value={value} min={min} max={max}
        onChange={(e) => { const v = Number(e.target.value); if (!Number.isNaN(v)) onChange(clamp(v)) }}
      />
      {suffix && <span className="muted small">{suffix}</span>}
      <button onClick={() => onChange(clamp(value + 1))} aria-label="Increase"><Plus size={14} /></button>
    </div>
  )
}

export function Seg<T extends string>({ value, options, onChange }: { value: T; options: { v: T; label: ReactNode }[]; onChange: (v: T) => void }) {
  const i = Math.max(0, options.findIndex((o) => o.v === value))
  return (
    <div className="seg" style={{ ['--i' as string]: i, ['--n' as string]: options.length }}>
      <span className="seg-ind" />
      {options.map((o) => (
        <button key={o.v} className={o.v === value ? 'on' : ''} onClick={() => onChange(o.v)}>{o.label}</button>
      ))}
    </div>
  )
}

export function Section({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <div className="s-section">
      <h3>{title}</h3>
      {sub && <p className="s-sub">{sub}</p>}
      {children}
    </div>
  )
}

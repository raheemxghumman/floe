import { useRef, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { useStore, type PanelId } from '../../store'

let zTop = 30

export function FloatingPanel({
  id, title, width, left, children, actions,
}: { id: PanelId; title: ReactNode; width: number; left: number; children: ReactNode; actions?: ReactNode }) {
  const open = useStore((s) => s.panels[id])
  const toggle = useStore((s) => s.togglePanel)
  const [off, setOff] = useState({ x: 0, y: 0 })
  const [z, setZ] = useState(30)
  const [dragging, setDragging] = useState(false)
  const start = useRef<{ px: number; py: number; x: number; y: number } | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  const front = () => setZ(++zTop)

  const onDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button, input') || window.innerWidth < 720) return
    front()
    start.current = { px: e.clientX, py: e.clientY, x: off.x, y: off.y }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    setDragging(true)
  }
  const onMove = (e: React.PointerEvent) => {
    const s = start.current
    if (!s || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    let x = s.x + e.clientX - s.px
    let y = s.y + e.clientY - s.py
    // keep at least the header on screen
    const baseLeft = r.left - off.x, baseTop = r.top - off.y
    x = Math.min(Math.max(x, -baseLeft + 8), window.innerWidth - baseLeft - 80)
    y = Math.min(Math.max(y, -baseTop + 8), window.innerHeight - baseTop - 48)
    setOff({ x, y })
  }
  const onUp = () => { start.current = null; setDragging(false) }

  return (
    <div
      ref={ref}
      className={`panel-pos ${dragging ? 'dragging' : ''}`}
      style={{
        left: Math.max(24, Math.min(left, window.innerWidth - width - 24)),
        width, zIndex: z, transform: `translate3d(${off.x}px, ${off.y}px, 0)`,
      }}
      onPointerDown={front}
    >
      <div className={`panel ${open ? 'open' : ''}`} aria-hidden={!open}>
        <header className="panel-head" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
          <div className="panel-title">{title}</div>
          <div className="panel-actions">
            {actions}
            <button className="icon-btn ghost xs" onClick={() => toggle(id)} aria-label="Close"><X size={15} /></button>
          </div>
        </header>
        <div className="panel-body">{children}</div>
      </div>
    </div>
  )
}

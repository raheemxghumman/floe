import { useEffect, useRef } from 'react'
import { Gift, PartyPopper } from 'lucide-react'
import { useStore } from '../store'
import { REWARDS, useLevel } from '../lib/levels'
import { CompanionArt } from './companions'

function Confetti() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const cv = ref.current!, ctx = cv.getContext('2d')!
    const w = (cv.width = window.innerWidth), h = (cv.height = window.innerHeight)
    const colors = ['#7432ff', '#ff7a59', '#fbbf24', '#34d399', '#60a5fa', '#f472b6']
    const bits = Array.from({ length: 160 }, () => ({
      x: w / 2, y: h * 0.45, vx: (Math.random() - 0.5) * 16, vy: -Math.random() * 16 - 4,
      r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3, s: 5 + Math.random() * 6, c: colors[Math.floor(Math.random() * colors.length)],
    }))
    let raf = 0, t = 0
    const tick = () => {
      t++
      ctx.clearRect(0, 0, w, h)
      for (const b of bits) {
        b.vy += 0.35; b.vx *= 0.99; b.x += b.vx; b.y += b.vy; b.r += b.vr
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.r); ctx.fillStyle = b.c
        ctx.globalAlpha = Math.max(0, 1 - t / 160); ctx.fillRect(-b.s / 2, -b.s / 4, b.s, b.s / 2); ctx.restore()
      }
      if (t < 170) raf = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [])
  return <canvas ref={ref} className="confetti" aria-hidden />
}

/** Celebrates new levels once, listing everything they unlocked. */
export function LevelUp() {
  const { level, infinite } = useLevel()
  const seen = useStore((s) => s.settings.pet.seenLevel)
  const pet = useStore((s) => s.settings.pet)
  const companion = useStore((s) => s.settings.modes.focus.companion)
  const updatePet = useStore((s) => s.updatePet)
  const open = !infinite && level > seen
  const unlocked = REWARDS.filter((r) => r.level > seen && r.level <= level)
  const close = () => updatePet({ seenLevel: level })
  if (!open) return null
  const newPet = unlocked.find((r) => r.kind === 'companion')
  return (
    <div className="lvl-root" onPointerDown={(e) => { if (e.target === e.currentTarget) close() }}>
      <Confetti />
      <div className="lvl-card" role="dialog" aria-label={`Level ${level}`}>
        <div className="lvl-pet">
          <CompanionArt id={newPet?.kind === 'companion' ? newPet.id : companion === 'none' ? 'tomato' : companion} state="idle" level={level} accessory={pet.accessory} />
        </div>
        <span className="lvl-kicker"><PartyPopper size={15} /> Level up!</span>
        <div className="lvl-num">{level}</div>
        <p className="muted">All those focused minutes add up. Keep going.</p>
        {unlocked.length > 0 && (
          <ul className="lvl-unlocks">
            {unlocked.map((r) => <li key={r.kind + r.id}><Gift size={14} /> {r.label} <em>{r.kind}</em></li>)}
          </ul>
        )}
        <div className="row-inline">
          <button className="btn ghost" onClick={() => { close(); useStore.getState().openSettings('companions') }}>See rewards</button>
          <button className="btn" onClick={close}>Nice!</button>
        </div>
      </div>
    </div>
  )
}

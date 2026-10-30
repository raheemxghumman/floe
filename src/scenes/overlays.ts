// Transparent animated layers drawn over photo themes so they feel alive.
import { glow, rand, TAU } from './util'

export type FxName = 'rain' | 'snow' | 'petals' | 'fireflies' | 'embers' | 'stars' | 'bubbles' | 'dust' | 'fog' | 'rays' | 'bokeh' | 'flicker'
/** An effect, optionally anchored to a point (0..1) of the photo, e.g. where a fireplace is. */
export type Fx = FxName | { fx: FxName; x?: number; y?: number; w?: number; h?: number; amount?: number; color?: string }

interface Layer { draw(t: number, dt: number): void }
type Maker = (ctx: CanvasRenderingContext2D, w: number, h: number, o: Exclude<Fx, string>) => Layer

const area = (o: Exclude<Fx, string>, w: number, h: number) => ({
  x0: ((o.x ?? 0.5) - (o.w ?? 1) / 2) * w, y0: ((o.y ?? 0.5) - (o.h ?? 1) / 2) * h, aw: (o.w ?? 1) * w, ah: (o.h ?? 1) * h,
})

const makers: Record<FxName, Maker> = {
  rain(ctx, w, h, o) {
    const n = Math.round((w * h) / 5200 * (o.amount ?? 1))
    const drops = Array.from({ length: n }, () => ({ x: rand(-w * 0.1, w * 1.1), y: rand(-h, h), l: rand(12, 26), v: rand(700, 1150), near: Math.random() < 0.25 }))
    return {
      draw(t, dt) {
        const wind = -0.1 + Math.sin(t * 0.2) * 0.04
        for (const near of [false, true]) {
          ctx.strokeStyle = near ? 'rgba(210,222,255,0.32)' : 'rgba(190,205,240,0.16)'
          ctx.lineWidth = near ? 1.3 : 0.8
          ctx.beginPath()
          for (const d of drops) {
            if (d.near !== near) continue
            d.y += d.v * dt * (near ? 1.2 : 0.85); d.x += d.v * wind * dt
            if (d.y > h) { d.y = rand(-60, -10); d.x = rand(-w * 0.1, w * 1.2) }
            const l = d.l * (near ? 1.5 : 1)
            ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - wind * l, d.y - l)
          }
          ctx.stroke()
        }
      },
    }
  },
  snow(ctx, w, h, o) {
    const n = Math.round((w * h) / 6000 * (o.amount ?? 1))
    const f = Array.from({ length: n }, () => ({ x: rand(0, w), y: rand(0, h), r: rand(0.8, 3.4), v: rand(20, 80), ph: rand(0, TAU) }))
    return {
      draw(t, dt) {
        ctx.fillStyle = '#fff'
        for (const s of f) {
          s.y += s.v * dt; s.x += (Math.sin(t * 0.9 + s.ph) * 18 + 8) * dt
          if (s.y > h + 4) { s.y = -4; s.x = rand(-20, w) }
          if (s.x > w + 6) s.x = -6
          ctx.globalAlpha = 0.35 + s.r / 5
          ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill()
        }
        ctx.globalAlpha = 1
      },
    }
  },
  petals(ctx, w, h, o) {
    const cols = ['#ffc4d6', '#ffb3c9', '#ffe2ea', '#f9a1bc']
    const p = Array.from({ length: Math.round(46 * (o.amount ?? 1)) }, () => ({ x: rand(0, w), y: rand(-h, h), s: rand(4, 8), r: rand(0, TAU), vr: rand(-1, 1), sp: rand(0, TAU), vs: rand(1.5, 4), vy: rand(22, 55), c: cols[Math.floor(Math.random() * 4)], ph: rand(0, TAU) }))
    return {
      draw(t, dt) {
        const wind = 26 + Math.sin(t * 0.3) * 26
        for (const q of p) {
          q.y += q.vy * dt; q.x += (wind + Math.sin(t + q.ph) * 18) * dt; q.r += q.vr * dt; q.sp += q.vs * dt
          if (q.y > h + 20 || q.x > w + 30) { q.y = rand(-60, -10); q.x = rand(-w * 0.3, w) }
          ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.r); ctx.scale(Math.cos(q.sp), 1)
          ctx.fillStyle = q.c; ctx.globalAlpha = 0.9
          ctx.beginPath(); ctx.ellipse(0, 0, q.s, q.s * 0.55, 0, 0, TAU); ctx.fill(); ctx.restore()
        }
        ctx.globalAlpha = 1
      },
    }
  },
  fireflies(ctx, w, h, o) {
    const a = area({ y: 0.7, h: 0.6, ...o }, w, h)
    const g = glow(o.color ?? '#d9ff8f', 24)
    const f = Array.from({ length: Math.round(40 * (o.amount ?? 1)) }, () => ({ x: a.x0 + rand(0, a.aw), y: a.y0 + rand(0, a.ah), vx: rand(-8, 8), vy: rand(-6, 6), ph: rand(0, TAU), sp: rand(0.6, 1.8), s: rand(0.5, 1.1) }))
    return {
      draw(t, dt) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter'
        for (const q of f) {
          q.vx += Math.sin(t * 0.7 + q.ph) * 5 * dt; q.vy += Math.cos(t * 0.5 + q.ph) * 5 * dt
          q.vx = Math.max(-12, Math.min(12, q.vx)); q.vy = Math.max(-9, Math.min(9, q.vy))
          q.x += q.vx * dt; q.y += q.vy * dt
          if (q.x < a.x0 || q.x > a.x0 + a.aw) q.vx *= -1
          if (q.y < a.y0 || q.y > a.y0 + a.ah) q.vy *= -1
          ctx.globalAlpha = Math.max(0, Math.sin(t * q.sp + q.ph)) ** 2 * 0.9
          const s = 16 * q.s
          ctx.drawImage(g, q.x - s, q.y - s, s * 2, s * 2)
        }
        ctx.restore()
      },
    }
  },
  embers(ctx, w, h, o) {
    const a = area({ y: 0.72, w: 0.3, h: 0.25, ...o }, w, h)
    const g = glow('#ff9a3c', 20)
    const sparks = Array.from({ length: Math.round(34 * (o.amount ?? 1)) }, () => ({ x: a.x0 + rand(0, a.aw), y: a.y0 + a.ah, vy: rand(30, 90), vx: rand(-12, 12), life: rand(0, 1), s: rand(0.6, 1.6) }))
    const warm = glow('#ff8a2a', 128)
    return {
      draw(t, dt) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter'
        const flick = 0.55 + Math.sin(t * 9.1) * 0.08 + Math.sin(t * 14.7) * 0.06 + Math.sin(t * 3.3) * 0.08
        ctx.globalAlpha = flick * 0.55
        const R = Math.max(a.aw, a.ah) * 1.6
        ctx.drawImage(warm, a.x0 + a.aw / 2 - R, a.y0 + a.ah / 2 - R, R * 2, R * 2)
        for (const s of sparks) {
          s.life += dt * 0.6
          s.y -= s.vy * dt; s.x += (s.vx + Math.sin(t * 3 + s.life * 10) * 10) * dt
          if (s.life > 1) { s.life = 0; s.x = a.x0 + rand(0, a.aw); s.y = a.y0 + a.ah }
          ctx.globalAlpha = (1 - s.life) * 0.9
          const r = 6 * s.s
          ctx.drawImage(g, s.x - r, s.y - r, r * 2, r * 2)
        }
        ctx.restore()
      },
    }
  },
  flicker(ctx, w, h, o) {
    const g = glow(o.color ?? '#ffb15c', 128)
    return {
      draw(t) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter'
        ctx.globalAlpha = 0.08 + Math.sin(t * 7.3) * 0.025 + Math.sin(t * 12.1) * 0.02
        const x = (o.x ?? 0.5) * w, y = (o.y ?? 0.6) * h, R = Math.max(w, h) * 0.6
        ctx.drawImage(g, x - R, y - R, R * 2, R * 2)
        ctx.restore()
      },
    }
  },
  stars(ctx, w, h, o) {
    const a = area({ y: 0.25, h: 0.5, ...o }, w, h)
    const s = Array.from({ length: Math.round((a.aw * a.ah) / 9000 * (o.amount ?? 1)) }, () => ({ x: a.x0 + rand(0, a.aw), y: a.y0 + rand(0, a.ah), r: rand(0.5, 1.6), ph: rand(0, TAU), sp: rand(0.6, 2.4) }))
    let shoot = { x: 0, y: 0, life: 0 }, next = 4
    return {
      draw(t, dt) {
        ctx.fillStyle = '#fff'
        for (const q of s) { ctx.globalAlpha = Math.max(0, 0.15 + 0.55 * Math.sin(t * q.sp + q.ph)); ctx.fillRect(q.x, q.y, q.r, q.r) }
        ctx.globalAlpha = 1
        if (t > next) { shoot = { x: a.x0 + rand(0, a.aw * 0.7), y: a.y0 + rand(0, a.ah * 0.5), life: 1 }; next = t + rand(6, 14) }
        if (shoot.life > 0) {
          shoot.life -= dt * 1.5; shoot.x += 700 * dt; shoot.y += 260 * dt
          const g = ctx.createLinearGradient(shoot.x, shoot.y, shoot.x - 120, shoot.y - 45)
          g.addColorStop(0, `rgba(255,255,255,${Math.max(0, shoot.life)})`); g.addColorStop(1, 'rgba(255,255,255,0)')
          ctx.strokeStyle = g; ctx.lineWidth = 1.4
          ctx.beginPath(); ctx.moveTo(shoot.x, shoot.y); ctx.lineTo(shoot.x - 120, shoot.y - 45); ctx.stroke()
        }
      },
    }
  },
  bubbles(ctx, w, h, o) {
    const b = Array.from({ length: Math.round(36 * (o.amount ?? 1)) }, () => ({ x: rand(0, w), y: rand(0, h), r: rand(2, 7), v: rand(20, 60), ph: rand(0, TAU) }))
    const caustic = glow('#bfe9ff', 128)
    return {
      draw(t, dt) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter'
        for (let i = 0; i < 3; i++) {
          ctx.globalAlpha = 0.06 + 0.04 * Math.sin(t * 0.8 + i * 2)
          const x = w * (0.2 + i * 0.3 + 0.05 * Math.sin(t * 0.3 + i)), R = w * 0.35
          ctx.drawImage(caustic, x - R, -R * 0.6, R * 2, R * 1.6)
        }
        ctx.restore()
        ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1
        for (const q of b) {
          q.y -= q.v * dt; q.x += Math.sin(t * 2 + q.ph) * 10 * dt
          if (q.y < -10) { q.y = h + 10; q.x = rand(0, w) }
          ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, TAU); ctx.stroke()
        }
      },
    }
  },
  dust(ctx, w, h, o) {
    const a = area(o, w, h)
    const d = Array.from({ length: Math.round(70 * (o.amount ?? 1)) }, () => ({ x: a.x0 + rand(0, a.aw), y: a.y0 + rand(0, a.ah), r: rand(0.6, 1.8), vx: rand(-4, 4), vy: rand(-3, 3), ph: rand(0, TAU) }))
    return {
      draw(t, dt) {
        ctx.fillStyle = o.color ?? 'rgba(255,240,210,0.7)'
        for (const q of d) {
          q.x += (q.vx + Math.sin(t * 0.4 + q.ph) * 3) * dt; q.y += (q.vy + Math.cos(t * 0.3 + q.ph) * 2) * dt
          if (q.x < a.x0) q.x = a.x0 + a.aw; else if (q.x > a.x0 + a.aw) q.x = a.x0
          if (q.y < a.y0) q.y = a.y0 + a.ah; else if (q.y > a.y0 + a.ah) q.y = a.y0
          ctx.globalAlpha = 0.25 + 0.45 * Math.max(0, Math.sin(t * 0.8 + q.ph))
          ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, TAU); ctx.fill()
        }
        ctx.globalAlpha = 1
      },
    }
  },
  fog(ctx, w, h, o) {
    const a = area({ y: 0.7, h: 0.5, ...o }, w, h)
    const puff = glow('#ffffff', 128)
    const p = Array.from({ length: 10 }, () => ({ x: rand(-0.2, 1.2) * w, y: a.y0 + rand(0, a.ah), r: rand(0.25, 0.5) * w, v: rand(6, 16), ph: rand(0, TAU) }))
    return {
      draw(t, dt) {
        for (const q of p) {
          q.x += q.v * dt
          if (q.x - q.r > w) q.x = -q.r
          ctx.globalAlpha = (o.amount ?? 1) * (0.07 + 0.04 * Math.sin(t * 0.3 + q.ph))
          ctx.drawImage(puff, q.x - q.r, q.y - q.r * 0.35, q.r * 2, q.r * 0.7)
        }
        ctx.globalAlpha = 1
      },
    }
  },
  rays(ctx, w, h, o) {
    const x = (o.x ?? 0.3) * w
    return {
      draw(t) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter'
        for (let i = 0; i < 6; i++) {
          const a = (o.amount ?? 1) * (0.03 + 0.025 * Math.sin(t * 0.25 + i * 1.3))
          const g = ctx.createLinearGradient(0, 0, 0, h)
          g.addColorStop(0, `rgba(255,240,200,${a})`); g.addColorStop(1, 'rgba(255,240,200,0)')
          ctx.fillStyle = g
          const sx = x + (i - 3) * w * 0.06 + Math.sin(t * 0.15 + i) * 14
          ctx.beginPath(); ctx.moveTo(sx, -10); ctx.lineTo(sx + w * 0.03, -10); ctx.lineTo(sx + w * 0.22, h); ctx.lineTo(sx + w * 0.12, h); ctx.fill()
        }
        ctx.restore()
      },
    }
  },
  bokeh(ctx, w, h, o) {
    const a = area({ y: 0.65, h: 0.6, ...o }, w, h)
    const cols = ['#ffb36b', '#ff6b8b', '#6bc5ff', '#ffd27a']
    const b = Array.from({ length: Math.round(22 * (o.amount ?? 1)) }, () => ({ x: a.x0 + rand(0, a.aw), y: a.y0 + rand(0, a.ah), r: rand(10, 44), g: glow(cols[Math.floor(Math.random() * 4)], 64), ph: rand(0, TAU) }))
    return {
      draw(t) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter'
        for (const q of b) {
          ctx.globalAlpha = 0.12 + 0.12 * Math.sin(t * 0.6 + q.ph)
          ctx.drawImage(q.g, q.x - q.r, q.y - q.r, q.r * 2, q.r * 2)
        }
        ctx.restore()
      },
    }
  },
}

/** Builds a combined layer for a list of effects. Coordinates are in CSS pixels. */
export function createOverlay(ctx: CanvasRenderingContext2D, w: number, h: number, list: Fx[]): Layer {
  const layers = list.map((f) => {
    const o = typeof f === 'string' ? { fx: f } : f
    return makers[o.fx](ctx, w, h, o)
  })
  return {
    draw(t, dt) {
      ctx.clearRect(0, 0, w, h)
      for (const l of layers) { ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; l.draw(t, dt) }
    },
  }
}

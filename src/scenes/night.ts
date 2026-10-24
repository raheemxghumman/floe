import { fillRidge, glow, layer, pineTree, rand, ridge, seeded, TAU, vgrad, vignette, type SceneFactory } from './util'

function gauss(rnd: () => number) {
  return (rnd() + rnd() + rnd() + rnd() - 2) / 2
}

/* ----------------------------------------------------- Starry Night */

export const stars: SceneFactory = (ctx, w, h, dpr) => {
  const bg = layer(w, h, dpr, (c) => {
    const rnd = seeded(3)
    c.fillStyle = vgrad(c, 0, h, [[0, '#03040c'], [0.5, '#0a1033'], [0.82, '#2b1d52'], [1, '#4a2a5e']])
    c.fillRect(0, 0, w, h)
    // milky way band
    c.save()
    c.translate(w / 2, h * 0.45)
    c.rotate(-0.45)
    const len = Math.hypot(w, h)
    for (let i = 0; i < 14; i++) {
      const x = (rnd() - 0.5) * len
      const r = 80 + rnd() * 160
      const g = c.createRadialGradient(x, gauss(rnd) * 40, 0, x, gauss(rnd) * 40, r)
      g.addColorStop(0, `rgba(${rnd() < 0.5 ? '150,130,255' : '120,170,255'},0.08)`)
      g.addColorStop(1, 'rgba(0,0,0,0)')
      c.fillStyle = g
      c.fillRect(x - r, -r, r * 2, r * 2)
    }
    for (let i = 0; i < 3500; i++) {
      c.fillStyle = `rgba(255,255,255,${rnd() * 0.5})`
      c.fillRect((rnd() - 0.5) * len, gauss(rnd) * 90, rnd() * 1.3, rnd() * 1.3)
    }
    c.restore()
  })
  const mountains = layer(w, h, dpr, (c) => {
    const rnd = seeded(8)
    fillRidge(c, ridge(w, h * 0.78, h * 0.25, rnd), h, vgrad(c, h * 0.6, h, [[0, '#1a1438'], [1, '#0d0a20']]))
    fillRidge(c, ridge(w, h * 0.9, h * 0.14, rnd), h, '#06050e')
  })
  const field = Array.from({ length: Math.round((w * h) / 5000) + 80 }, () => ({
    x: rand(0, w), y: rand(0, h * 0.85), r: rand(0.4, 1.6), b: rand(0.3, 0.9), sp: rand(0.5, 3), ph: rand(0, TAU),
  }))
  const big = glow('#cfd8ff', 16)
  const shooting: { x: number; y: number; vx: number; vy: number; life: number }[] = []
  let next = 2

  return {
    draw(t, dt) {
      ctx.drawImage(bg, 0, 0, w, h)
      for (const s of field) {
        const a = s.b + Math.sin(t * s.sp + s.ph) * 0.3
        ctx.globalAlpha = Math.max(0, a)
        ctx.fillStyle = '#fff'
        ctx.fillRect(s.x, s.y, s.r, s.r)
        if (s.r > 1.4) ctx.drawImage(big, s.x - 6, s.y - 6, 12, 12)
      }
      ctx.globalAlpha = 1
      if (t > next) {
        next = t + rand(3, 8)
        const a = rand(0.35, 0.7) * (Math.random() < 0.5 ? 1 : -1)
        shooting.push({ x: rand(w * 0.1, w * 0.9), y: rand(0, h * 0.35), vx: Math.sin(a) * 900, vy: Math.cos(Math.abs(a)) * 450, life: 1 })
      }
      for (let i = shooting.length - 1; i >= 0; i--) {
        const s = shooting[i]
        s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt * 1.4
        if (s.life <= 0) { shooting.splice(i, 1); continue }
        const tail = 0.18
        const g = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * tail, s.y - s.vy * tail)
        g.addColorStop(0, `rgba(255,255,255,${s.life})`)
        g.addColorStop(1, 'rgba(255,255,255,0)')
        ctx.strokeStyle = g
        ctx.lineWidth = 1.6
        ctx.beginPath()
        ctx.moveTo(s.x, s.y)
        ctx.lineTo(s.x - s.vx * tail, s.y - s.vy * tail)
        ctx.stroke()
      }
      ctx.drawImage(mountains, 0, 0, w, h)
    },
  }
}

/* ------------------------------------------------------------ Aurora */

export const aurora: SceneFactory = (ctx, w, h, dpr) => {
  const bg = layer(w, h, dpr, (c) => {
    const rnd = seeded(17)
    c.fillStyle = vgrad(c, 0, h, [[0, '#01030a'], [0.5, '#03142a'], [0.8, '#06313a'], [1, '#0a2a2a']])
    c.fillRect(0, 0, w, h)
    for (let i = 0; i < 400; i++) {
      c.fillStyle = `rgba(255,255,255,${rnd() * 0.6})`
      c.fillRect(rnd() * w, rnd() * h * 0.7, rnd() * 1.4, rnd() * 1.4)
    }
  })
  const fg = layer(w, h, dpr, (c) => {
    const rnd = seeded(29)
    const far = ridge(w, h * 0.72, h * 0.28, rnd)
    fillRidge(c, far, h, vgrad(c, h * 0.5, h, [[0, '#1f3b4a'], [0.4, '#0b1c26'], [1, '#050d12']]))
    // snow caps catching the aurora light
    c.save()
    c.globalAlpha = 0.25
    c.strokeStyle = '#9fffd8'
    c.lineWidth = 1.5
    c.beginPath()
    far.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)))
    c.stroke()
    c.restore()
    fillRidge(c, ridge(w, h * 0.86, h * 0.1, rnd), h, '#050c12')
    for (let x = -20; x < w + 20; x += 14 + rnd() * 22) {
      const th = h * (0.08 + rnd() * 0.12)
      pineTree(c, x, h * (0.94 + rnd() * 0.06), th, '#02070a')
    }
  })
  const strip = document.createElement('canvas')
  strip.width = 1; strip.height = 256
  {
    const c = strip.getContext('2d')!
    const g = c.createLinearGradient(0, 256, 0, 0)
    g.addColorStop(0, 'rgba(90,255,180,0)')
    g.addColorStop(0.06, 'rgba(110,255,190,0.95)')
    g.addColorStop(0.3, 'rgba(60,230,160,0.5)')
    g.addColorStop(0.65, 'rgba(120,100,255,0.25)')
    g.addColorStop(1, 'rgba(160,80,255,0)')
    c.fillStyle = g
    c.fillRect(0, 0, 1, 256)
  }
  const ribbons = [
    { base: 0.38, amp: 0.07, f1: 0.0035, f2: 0.009, s1: 0.18, s2: 0.11, hgt: 0.32, a: 0.5 },
    { base: 0.3, amp: 0.06, f1: 0.0025, f2: 0.007, s1: -0.12, s2: 0.15, hgt: 0.26, a: 0.35 },
    { base: 0.46, amp: 0.05, f1: 0.005, f2: 0.012, s1: 0.22, s2: -0.09, hgt: 0.2, a: 0.3 },
  ]
  return {
    draw(t) {
      ctx.drawImage(bg, 0, 0, w, h)
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      const step = 3
      ribbons.forEach((r, i) => {
        for (let x = 0; x < w; x += step) {
          const y = h * r.base + Math.sin(x * r.f1 + t * r.s1) * h * r.amp + Math.sin(x * r.f2 - t * r.s2) * h * r.amp * 0.5
          const hg = h * r.hgt * (0.55 + 0.45 * Math.sin(x * 0.004 + t * 0.3 + i))
          const a = r.a * (0.45 + 0.55 * Math.sin(x * 0.008 + t * 0.6 + i * 2))
          if (a <= 0.02) continue
          ctx.globalAlpha = a
          ctx.drawImage(strip, x, y - hg, step, hg)
        }
      })
      ctx.restore()
      ctx.globalAlpha = 1
      ctx.drawImage(fg, 0, 0, w, h)
    },
  }
}

/* ------------------------------------------------------ Winter Cabin */

export const snow: SceneFactory = (ctx, w, h, dpr) => {
  const ground = h * 0.8
  const cabinX = w * 0.3
  const cw = Math.min(w, h) * 0.16
  const bg = layer(w, h, dpr, (c) => {
    const rnd = seeded(13)
    c.fillStyle = vgrad(c, 0, h, [[0, '#0b1430'], [0.55, '#22396a'], [0.8, '#5c77a6'], [1, '#8ea3c4']])
    c.fillRect(0, 0, w, h)
    const mx = w * 0.78, my = h * 0.18, mr = Math.min(w, h) * 0.045
    const mg = c.createRadialGradient(mx, my, mr, mx, my, mr * 7)
    mg.addColorStop(0, 'rgba(220,230,255,0.35)')
    mg.addColorStop(1, 'rgba(220,230,255,0)')
    c.fillStyle = mg
    c.fillRect(0, 0, w, h)
    c.fillStyle = '#eef2ff'
    c.beginPath(); c.arc(mx, my, mr, 0, TAU); c.fill()
    for (let i = 0; i < 160; i++) {
      c.fillStyle = `rgba(255,255,255,${rnd() * 0.6})`
      c.fillRect(rnd() * w, rnd() * h * 0.5, 1, 1)
    }
    for (let x = -20; x < w + 20; x += 10 + rnd() * 18) pineTree(c, x, ground - h * 0.02 + rnd() * 10, h * (0.12 + rnd() * 0.1), 'rgba(40,62,100,0.9)', 'rgba(170,190,220,0.4)')
    for (let x = -20; x < w + 20; x += 16 + rnd() * 30) pineTree(c, x, ground + 6, h * (0.16 + rnd() * 0.14), '#16264a', 'rgba(200,215,240,0.55)')
    // snowy ground
    c.fillStyle = vgrad(c, ground, h, [[0, '#cfdbee'], [1, '#7f95ba']])
    c.beginPath()
    c.moveTo(0, ground)
    for (let x = 0; x <= w; x += 20) c.lineTo(x, ground + Math.sin(x * 0.004) * 12 + Math.sin(x * 0.011) * 5)
    c.lineTo(w, h); c.lineTo(0, h); c.fill()
    // cabin
    const cy = ground + 4
    c.fillStyle = '#1a1626'
    c.fillRect(cabinX - cw / 2, cy - cw * 0.55, cw, cw * 0.55)
    c.fillRect(cabinX + cw * 0.22, cy - cw * 0.95, cw * 0.1, cw * 0.3)
    c.beginPath()
    c.moveTo(cabinX - cw * 0.62, cy - cw * 0.52)
    c.lineTo(cabinX, cy - cw * 0.95)
    c.lineTo(cabinX + cw * 0.62, cy - cw * 0.52)
    c.fill()
    c.fillStyle = '#e8eefa'
    c.beginPath()
    c.moveTo(cabinX - cw * 0.66, cy - cw * 0.5)
    c.lineTo(cabinX, cy - cw * 0.99)
    c.lineTo(cabinX + cw * 0.66, cy - cw * 0.5)
    c.lineTo(cabinX + cw * 0.6, cy - cw * 0.46)
    c.lineTo(cabinX, cy - cw * 0.88)
    c.lineTo(cabinX - cw * 0.6, cy - cw * 0.46)
    c.fill()
    // foreground trees
    for (const [x, s] of [[w * 0.04, 0.5], [w * 0.92, 0.6], [w * 0.98, 0.42], [w * 0.62, 0.3]] as const)
      pineTree(c, x, h + 10, h * s, '#070d1c', 'rgba(220,230,250,0.7)')
  })
  const vig = vignette(w, h, dpr, 0.4)
  const win = glow('#ffb15c', 64)
  const layers = [
    { n: 220, r: [0.6, 1.3], v: [18, 35], a: 0.5 },
    { n: 140, r: [1.4, 2.4], v: [35, 60], a: 0.75 },
    { n: 50, r: [2.6, 4.2], v: [60, 100], a: 0.9 },
  ]
  const scale = (w * h) / (1600 * 900)
  const flakes = layers.flatMap((l) =>
    Array.from({ length: Math.round(l.n * Math.max(0.4, scale)) }, () => ({
      x: rand(0, w), y: rand(0, h), r: rand(l.r[0], l.r[1]), v: rand(l.v[0], l.v[1]), a: l.a, ph: rand(0, TAU),
    })),
  )
  const smoke = Array.from({ length: 22 }, (_, i) => ({ life: i / 22 }))
  const chimney = { x: cabinX + cw * 0.27, y: ground + 4 - cw * 0.95 }

  return {
    draw(t, dt) {
      ctx.drawImage(bg, 0, 0, w, h)
      // smoke
      for (const s of smoke) {
        s.life += dt * 0.12
        if (s.life > 1) s.life -= 1
        const p = s.life
        ctx.fillStyle = `rgba(200,210,230,${0.18 * (1 - p)})`
        ctx.beginPath()
        ctx.arc(chimney.x + Math.sin(p * 6 + t * 0.5) * 12 + p * 50, chimney.y - p * h * 0.25, 4 + p * 26, 0, TAU)
        ctx.fill()
      }
      // flickering windows
      const flick = 0.75 + Math.sin(t * 7) * 0.05 + Math.sin(t * 13.3) * 0.05
      const wy = ground + 4 - cw * 0.3
      ctx.fillStyle = `rgba(255,190,110,${flick})`
      ctx.fillRect(cabinX - cw * 0.32, wy, cw * 0.16, cw * 0.14)
      ctx.fillRect(cabinX + cw * 0.12, wy, cw * 0.16, cw * 0.14)
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      ctx.globalAlpha = flick * 0.5
      ctx.drawImage(win, cabinX - cw * 0.9, wy - cw * 0.6, cw * 1.8, cw * 1.4)
      ctx.restore()

      const wind = Math.sin(t * 0.2) * 25 + 10
      ctx.fillStyle = '#fff'
      for (const f of flakes) {
        f.y += f.v * dt
        f.x += (wind * (f.v / 60) + Math.sin(t * 1.2 + f.ph) * 14) * dt
        if (f.y > h + 5) { f.y = -5; f.x = rand(-50, w + 50) }
        if (f.x > w + 60) f.x = -50; else if (f.x < -60) f.x = w + 50
        ctx.globalAlpha = f.a
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, TAU); ctx.fill()
      }
      ctx.globalAlpha = 1
      ctx.drawImage(vig, 0, 0, w, h)
    },
  }
}

import { glow, hexA, layer, pick, rand, ridge, fillRidge, seeded, TAU, vgrad, vignette, type SceneFactory } from './util'

/* ---------------------------------------------------------- helpers */

function leafCluster(c: CanvasRenderingContext2D, x: number, y: number, r: number, colors: string[], n: number, rnd: () => number, alpha = 0.85) {
  for (let i = 0; i < n; i++) {
    const a = rnd() * TAU
    const d = Math.sqrt(rnd()) * r
    const s = r * (0.08 + rnd() * 0.14)
    c.save()
    c.translate(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.8)
    c.rotate(rnd() * TAU)
    c.globalAlpha = alpha * (0.6 + rnd() * 0.4)
    c.fillStyle = colors[Math.floor(rnd() * colors.length)]
    c.beginPath()
    c.ellipse(0, 0, s, s * 0.45, 0, 0, TAU)
    c.fill()
    c.restore()
  }
  c.globalAlpha = 1
}

function fern(c: CanvasRenderingContext2D, x: number, y: number, len: number, ang: number, color: string, rnd: () => number) {
  c.save()
  c.translate(x, y)
  c.rotate(ang)
  c.strokeStyle = color
  c.fillStyle = color
  c.lineWidth = 1.5
  const bend = (rnd() - 0.5) * 0.6
  c.beginPath()
  c.moveTo(0, 0)
  c.quadraticCurveTo(len * bend, -len * 0.5, len * bend * 1.6, -len)
  c.stroke()
  for (let i = 1; i < 18; i++) {
    const p = i / 18
    const px = len * bend * 1.6 * p * p + len * bend * (1 - p) * p * 2 * 0.5
    const py = -len * p
    const s = len * 0.14 * (1 - p * 0.8)
    for (const side of [-1, 1]) {
      c.beginPath()
      c.ellipse(px + side * s * 0.6, py, s * 0.7, s * 0.18, side * 0.5, 0, TAU)
      c.fill()
    }
  }
  c.restore()
}

function daisy(c: CanvasRenderingContext2D, x: number, y: number, r: number, petal = '#f3f1e6', center = '#e8b931') {
  c.save()
  c.translate(x, y)
  c.scale(1, 0.75)
  c.fillStyle = petal
  for (let i = 0; i < 11; i++) {
    c.rotate(TAU / 11)
    c.beginPath()
    c.ellipse(r * 0.55, 0, r * 0.5, r * 0.16, 0, 0, TAU)
    c.fill()
  }
  c.fillStyle = center
  c.beginPath()
  c.arc(0, 0, r * 0.28, 0, TAU)
  c.fill()
  c.restore()
}

/* ------------------------------------------------- Enchanted Forest */

export const forest: SceneFactory = (ctx, w, h, dpr) => {
  const LW = w * 1.04, LH = h * 1.04
  const deep = ['#14291b', '#1b3523', '#213f28', '#18301f']
  const mid = ['#2c5229', '#386432', '#457640', '#53883f', '#2a4a2a']
  const bright = ['#5f9448', '#78a84f', '#8fb85a', '#4e7f3c']

  const bg = layer(w, h, dpr, (c) => {
    const rnd = seeded(11)
    c.fillStyle = vgrad(c, 0, h, [[0, '#0a1610'], [0.45, '#14291c'], [1, '#0b170f']])
    c.fillRect(0, 0, w, h)
    const g = c.createRadialGradient(w * 0.55, h * 0.5, 0, w * 0.55, h * 0.5, Math.max(w, h) * 0.45)
    g.addColorStop(0, 'rgba(170,190,100,0.38)')
    g.addColorStop(0.5, 'rgba(90,130,70,0.14)')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    c.fillStyle = g
    c.fillRect(0, 0, w, h)
    // distant trunks
    for (let i = 0; i < 16; i++) {
      const x = rnd() * w
      const tw = 4 + rnd() * 16
      c.fillStyle = `rgba(12,30,18,${0.35 + rnd() * 0.4})`
      c.beginPath()
      c.moveTo(x - tw / 2, -10)
      c.bezierCurveTo(x + tw * 2, h * 0.3, x - tw * 2, h * 0.5, x - tw, h * 0.78)
      c.lineTo(x + tw * 1.2, h * 0.78)
      c.bezierCurveTo(x - tw, h * 0.5, x + tw * 3, h * 0.3, x + tw / 2, -10)
      c.fill()
    }
    // canopy haze
    for (let i = 0; i < 70; i++) {
      const x = rnd() * w
      const y = Math.pow(rnd(), 1.6) * h * 0.55
      leafCluster(c, x, y, 30 + rnd() * 70, deep, 40, rnd, 0.6)
    }
    // winding pinkish path into the clearing
    c.save()
    c.filter = 'blur(7px)'
    const pg = c.createLinearGradient(0, h * 0.5, 0, h)
    pg.addColorStop(0, 'rgba(214,190,170,0.05)')
    pg.addColorStop(1, 'rgba(214,180,165,0.32)')
    c.fillStyle = pg
    c.beginPath()
    c.moveTo(w * 0.6, h * 0.52)
    c.bezierCurveTo(w * 0.67, h * 0.62, w * 0.55, h * 0.74, w * 0.6, h * 1.02)
    c.lineTo(w * 0.76, h * 1.02)
    c.bezierCurveTo(w * 0.66, h * 0.74, w * 0.71, h * 0.62, w * 0.612, h * 0.52)
    c.fill()
    c.restore()
    // pale specks of blossoms in the clearing
    for (let i = 0; i < 220; i++) {
      const x = w * (0.45 + (rnd() - 0.3) * 0.5)
      const y = h * (0.35 + rnd() * 0.4)
      c.fillStyle = hexA(pick(['#d8e7ff', '#ffffff', '#cfe4c5']), 0.25 + rnd() * 0.35)
      c.beginPath(); c.arc(x, y, 0.8 + rnd() * 1.6, 0, TAU); c.fill()
    }
  })

  const midLayer = layer(LW, LH, dpr, (c) => {
    const rnd = seeded(23)
    // side and bottom bushes
    for (let i = 0; i < 60; i++) {
      const side = rnd()
      let x: number, y: number
      if (side < 0.35) { x = rnd() * LW * 0.22; y = rnd() * LH }
      else if (side < 0.7) { x = LW - rnd() * LW * 0.22; y = rnd() * LH }
      else { x = rnd() * LW; y = LH * (0.7 + rnd() * 0.3) }
      leafCluster(c, x, y, 40 + rnd() * 80, mid, 80, rnd)
    }
    for (let i = 0; i < 26; i++) {
      const left = rnd() < 0.5
      fern(c, left ? rnd() * LW * 0.3 : LW - rnd() * LW * 0.3, LH * (0.55 + rnd() * 0.45), 80 + rnd() * 140, (left ? 1 : -1) * (0.2 + rnd() * 0.6), pick(mid), rnd)
    }
  })

  const fgLayer = layer(LW, LH, dpr, (c) => {
    const rnd = seeded(41)
    for (let i = 0; i < 30; i++) {
      const left = rnd() < 0.5
      const x = left ? rnd() * LW * 0.3 : LW - rnd() * LW * 0.3
      leafCluster(c, x, LH * (0.78 + rnd() * 0.25), 50 + rnd() * 70, bright.concat(mid), 70, rnd)
    }
    for (let i = 0; i < 18; i++) daisy(c, LW * (0.1 + rnd() * 0.3), LH * (0.75 + rnd() * 0.22), 10 + rnd() * 14)
    for (let i = 0; i < 8; i++) daisy(c, LW * (0.55 + rnd() * 0.35), LH * (0.8 + rnd() * 0.18), 7 + rnd() * 9)
    // pink & yellow wildflowers
    for (let i = 0; i < 400; i++) {
      const left = rnd() < 0.45
      const x = left ? rnd() * LW * 0.25 : LW * (0.7 + rnd() * 0.3)
      const y = LH * (0.4 + rnd() * 0.6)
      c.fillStyle = hexA(pick(['#d85c8a', '#e57aa3', '#f0c34a', '#b84a73']), 0.7 + rnd() * 0.3)
      c.beginPath(); c.arc(x, y, 1.2 + rnd() * 2.6, 0, TAU); c.fill()
    }
  })

  const vig = vignette(w, h, dpr, 0.6)
  const fly = glow('#d9ff8f', 24)
  const fireflies = Array.from({ length: Math.round((w * h) / 22000) + 30 }, () => ({
    x: rand(0, w), y: rand(h * 0.2, h), vx: rand(-10, 10), vy: rand(-8, 8),
    ph: rand(0, TAU), sp: rand(0.6, 1.8), s: rand(0.5, 1.2),
  }))
  const motes = Array.from({ length: 60 }, () => ({ x: rand(0, w), y: rand(0, h), s: rand(0.5, 1.5), v: rand(4, 14), ph: rand(0, TAU) }))
  const rays = Array.from({ length: 6 }, (_, i) => ({ x: w * (0.3 + i * 0.09 + rand(-0.03, 0.03)), wd: rand(30, 90), ph: rand(0, TAU) }))

  return {
    draw(t, dt) {
      ctx.drawImage(bg, 0, 0, w, h)
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      for (const r of rays) {
        const a = 0.035 + 0.03 * Math.sin(t * 0.25 + r.ph)
        const g = ctx.createLinearGradient(0, 0, 0, h * 0.9)
        g.addColorStop(0, `rgba(220,240,170,${a})`)
        g.addColorStop(1, 'rgba(220,240,170,0)')
        ctx.fillStyle = g
        const sway = Math.sin(t * 0.15 + r.ph) * 20
        ctx.beginPath()
        ctx.moveTo(r.x - r.wd * 0.3 + sway, -10)
        ctx.lineTo(r.x + r.wd * 0.3 + sway, -10)
        ctx.lineTo(r.x + r.wd * 1.6 + 140, h * 0.9)
        ctx.lineTo(r.x - r.wd * 0.4 + 140, h * 0.9)
        ctx.fill()
      }
      ctx.restore()

      ctx.drawImage(midLayer, -w * 0.02 + Math.sin(t * 0.4) * 4, -h * 0.02, LW, LH)

      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      for (const f of fireflies) {
        f.vx += Math.sin(t * 0.7 + f.ph) * 6 * dt
        f.vy += Math.cos(t * 0.5 + f.ph * 1.3) * 6 * dt
        f.vx = Math.max(-14, Math.min(14, f.vx)); f.vy = Math.max(-10, Math.min(10, f.vy))
        f.x += f.vx * dt; f.y += f.vy * dt
        if (f.x < -20) f.x = w + 20; else if (f.x > w + 20) f.x = -20
        if (f.y < h * 0.1) f.vy = Math.abs(f.vy); else if (f.y > h + 10) f.y = h * 0.2
        const a = Math.max(0, Math.sin(t * f.sp + f.ph)) ** 2
        ctx.globalAlpha = a * 0.9
        const s = 18 * f.s
        ctx.drawImage(fly, f.x - s, f.y - s, s * 2, s * 2)
      }
      ctx.restore()

      ctx.drawImage(fgLayer, -w * 0.02 + Math.sin(t * 0.55 + 1) * 7, -h * 0.02 + Math.sin(t * 0.3) * 2, LW, LH)

      ctx.fillStyle = 'rgba(240,250,220,0.5)'
      for (const m of motes) {
        m.y += m.v * dt * 0.4; m.x += Math.sin(t * 0.6 + m.ph) * 6 * dt
        if (m.y > h) { m.y = -5; m.x = rand(0, w) }
        ctx.beginPath(); ctx.arc(m.x, m.y, m.s, 0, TAU); ctx.fill()
      }
      ctx.drawImage(vig, 0, 0, w, h)
    },
  }
}

/* ------------------------------------------------------------ Sakura */

function branch(c: CanvasRenderingContext2D, x: number, y: number, len: number, ang: number, width: number, depth: number, rnd: () => number, tips: [number, number][]) {
  const x2 = x + Math.cos(ang) * len
  const y2 = y + Math.sin(ang) * len
  c.strokeStyle = '#2a1420'
  c.lineWidth = width
  c.lineCap = 'round'
  c.beginPath()
  c.moveTo(x, y)
  c.quadraticCurveTo((x + x2) / 2 + (rnd() - 0.5) * len * 0.3, (y + y2) / 2 + (rnd() - 0.5) * len * 0.3, x2, y2)
  c.stroke()
  if (depth <= 0) { tips.push([x2, y2]); return }
  const kids = 2 + (rnd() < 0.4 ? 1 : 0)
  for (let i = 0; i < kids; i++)
    branch(c, x2, y2, len * (0.6 + rnd() * 0.2), ang + (rnd() - 0.5) * 1.3, width * 0.65, depth - 1, rnd, tips)
  if (depth < 3) tips.push([x2, y2])
}

export const sakura: SceneFactory = (ctx, w, h, dpr) => {
  const bg = layer(w, h, dpr, (c) => {
    const rnd = seeded(5)
    c.fillStyle = vgrad(c, 0, h, [[0, '#24142f'], [0.4, '#5a2f5c'], [0.75, '#b46a8a'], [1, '#eeaaa9']])
    c.fillRect(0, 0, w, h)
    const sun = c.createRadialGradient(w * 0.35, h * 0.62, 0, w * 0.35, h * 0.62, h * 0.5)
    sun.addColorStop(0, 'rgba(255,220,200,0.55)')
    sun.addColorStop(0.2, 'rgba(255,190,190,0.2)')
    sun.addColorStop(1, 'rgba(255,190,190,0)')
    c.fillStyle = sun
    c.fillRect(0, 0, w, h)
    fillRidge(c, ridge(w, h * 0.72, h * 0.22, rnd, 7), h, 'rgba(90,45,85,0.55)')
    fillRidge(c, ridge(w, h * 0.82, h * 0.12, rnd, 7), h, 'rgba(60,28,62,0.8)')
    fillRidge(c, ridge(w, h * 0.92, h * 0.06, rnd, 7), h, '#2a1530')
  })
  const tree = layer(w, h, dpr, (c) => {
    const rnd = seeded(9)
    const tips: [number, number][] = []
    const base = Math.min(w, h)
    branch(c, w + 20, h * 0.05, base * 0.3, Math.PI * 0.88, base * 0.035, 5, rnd, tips)
    branch(c, -20, -10, base * 0.22, Math.PI * 0.2, base * 0.025, 4, rnd, tips)
    for (const [x, y] of tips) {
      for (let i = 0; i < 26; i++) {
        const a = rnd() * TAU, d = rnd() * 26
        c.fillStyle = hexA(pick(['#ffc4d6', '#ffb3c9', '#ffe0ea', '#f590b0', '#ffd0dd']), 0.75 + rnd() * 0.25)
        c.beginPath()
        c.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, 2.5 + rnd() * 4, 0, TAU)
        c.fill()
      }
    }
  })
  const petalColors = ['#ffc4d6', '#ffb3c9', '#ffe2ea', '#f9a1bc']
  const petals = Array.from({ length: Math.round((w * h) / 20000) + 40 }, () => ({
    x: rand(0, w), y: rand(-h, h), s: rand(4, 9), rot: rand(0, TAU), vr: rand(-1, 1),
    spin: rand(0, TAU), vs: rand(1.5, 4), vy: rand(25, 60), col: pick(petalColors), ph: rand(0, TAU),
  }))
  const spark = glow('#ffd6e4', 20)
  return {
    draw(t, dt) {
      ctx.drawImage(bg, 0, 0, w, h)
      ctx.save()
      ctx.translate(Math.sin(t * 0.35) * 3, Math.sin(t * 0.25) * 2)
      ctx.drawImage(tree, 0, 0, w, h)
      ctx.restore()
      const wind = 30 + Math.sin(t * 0.3) * 30
      for (const p of petals) {
        p.y += p.vy * dt
        p.x += (wind + Math.sin(t + p.ph) * 20) * dt
        p.rot += p.vr * dt
        p.spin += p.vs * dt
        if (p.y > h + 20 || p.x > w + 30) { p.y = rand(-60, -10); p.x = rand(-w * 0.3, w) }
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.scale(Math.cos(p.spin), 1)
        ctx.fillStyle = p.col
        ctx.beginPath()
        ctx.moveTo(0, -p.s)
        ctx.bezierCurveTo(p.s * 0.9, -p.s * 0.6, p.s * 0.7, p.s * 0.6, 0, p.s)
        ctx.bezierCurveTo(-p.s * 0.7, p.s * 0.6, -p.s * 0.9, -p.s * 0.6, 0, -p.s)
        ctx.fill()
        ctx.restore()
      }
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      for (let i = 0; i < 14; i++) {
        const x = (i * 197.3 + t * 8) % w
        const y = h * 0.3 + ((i * 113.7) % (h * 0.6))
        ctx.globalAlpha = 0.25 + 0.25 * Math.sin(t * 0.8 + i)
        ctx.drawImage(spark, x - 20, y - 20, 40, 40)
      }
      ctx.restore()
    },
  }
}

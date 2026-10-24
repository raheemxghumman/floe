import { fillRidge, glow, layer, pick, rand, ridge, seeded, TAU, vgrad, vignette, type SceneFactory } from './util'

/* --------------------------------------------------------- Rainy City */

export const rain: SceneFactory = (ctx, w, h, dpr) => {
  const bg = layer(w, h, dpr, (c) => {
    const rnd = seeded(21)
    c.fillStyle = vgrad(c, 0, h, [[0, '#070b18'], [0.55, '#121833'], [1, '#22192f']])
    c.fillRect(0, 0, w, h)
    const city = layer(w, h, 1, (k) => {
      for (let pass = 0; pass < 2; pass++) {
        let x = -20
        while (x < w + 20) {
          const bw = 30 + rnd() * 90
          const bh = h * (pass ? 0.2 + rnd() * 0.3 : 0.3 + rnd() * 0.35)
          const top = h - bh
          k.fillStyle = pass ? '#090b17' : '#131830'
          k.fillRect(x, top, bw, bh)
          for (let wy = top + 8; wy < h - 6; wy += 9) {
            for (let wx = x + 5; wx < x + bw - 5; wx += 8) {
              if (rnd() < (pass ? 0.22 : 0.12)) {
                k.fillStyle = pick(['rgba(255,196,120,0.85)', 'rgba(255,220,170,0.7)', 'rgba(140,200,255,0.6)'])
                k.fillRect(wx, wy, 3.5, 4.5)
              }
            }
          }
          x += bw + rnd() * 6
        }
      }
    })
    c.filter = 'blur(5px)'
    c.drawImage(city, 0, 0, w, h)
    c.filter = 'none'
    const fog = c.createLinearGradient(0, h * 0.4, 0, h)
    fog.addColorStop(0, 'rgba(60,50,90,0)')
    fog.addColorStop(1, 'rgba(60,50,90,0.35)')
    c.fillStyle = fog
    c.fillRect(0, 0, w, h)
  })
  const vig = vignette(w, h, dpr, 0.55)
  const bokehCols = ['#ffb36b', '#ff6b8b', '#6bc5ff', '#ffd27a', '#b48bff']
  const bokeh = Array.from({ length: 34 }, () => ({
    x: rand(0, w), y: rand(h * 0.3, h), r: rand(14, 60), c: glow(pick(bokehCols), 64), a: rand(0.12, 0.32), ph: rand(0, TAU), vx: rand(-3, 3),
  }))
  const n = Math.round((w * h) / 3800)
  const drops = Array.from({ length: n }, () => ({ x: rand(-w * 0.1, w * 1.1), y: rand(-h, h), l: rand(10, 26), v: rand(700, 1100), near: Math.random() < 0.25 }))
  const glass = Array.from({ length: 36 }, () => ({ x: rand(0, w), y: rand(0, h), r: rand(2, 6), v: 0, hold: rand(0, 6) }))
  const dropSprite = layer(16, 16, 2, (c) => {
    const g = c.createRadialGradient(6, 6, 0, 8, 8, 8)
    g.addColorStop(0, 'rgba(255,255,255,0.7)')
    g.addColorStop(0.35, 'rgba(200,220,255,0.18)')
    g.addColorStop(0.85, 'rgba(10,15,30,0.35)')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    c.fillStyle = g
    c.beginPath(); c.arc(8, 8, 8, 0, TAU); c.fill()
  })
  let flash = 0
  let nextBolt = rand(6, 14)

  return {
    draw(t, dt) {
      ctx.drawImage(bg, 0, 0, w, h)
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      for (const b of bokeh) {
        b.x += b.vx * dt
        if (b.x < -80) b.x = w + 80; else if (b.x > w + 80) b.x = -80
        ctx.globalAlpha = b.a * (0.7 + 0.3 * Math.sin(t * 0.7 + b.ph))
        ctx.drawImage(b.c, b.x - b.r, b.y - b.r, b.r * 2, b.r * 2)
      }
      ctx.restore()

      const wind = -0.12 + Math.sin(t * 0.2) * 0.05
      for (const near of [false, true]) {
        ctx.strokeStyle = near ? 'rgba(200,215,255,0.38)' : 'rgba(170,190,240,0.2)'
        ctx.lineWidth = near ? 1.4 : 0.8
        ctx.beginPath()
        for (const d of drops) {
          if (d.near !== near) continue
          d.y += d.v * dt * (near ? 1.2 : 0.8)
          d.x += d.v * wind * dt
          if (d.y > h) { d.y = rand(-60, -10); d.x = rand(-w * 0.1, w * 1.2) }
          const l = d.l * (near ? 1.6 : 1)
          ctx.moveTo(d.x, d.y)
          ctx.lineTo(d.x - wind * l, d.y - l)
        }
        ctx.stroke()
      }

      for (const g of glass) {
        if (g.hold > 0) g.hold -= dt
        else { g.v = Math.min(g.v + 120 * dt, 160); g.y += g.v * dt; g.x += Math.sin(g.y * 0.05) * 0.3 }
        if (g.y > h + 10) { g.y = rand(-10, h * 0.8); g.x = rand(0, w); g.v = 0; g.hold = rand(2, 9) }
        ctx.drawImage(dropSprite, g.x - g.r, g.y - g.r * 1.1, g.r * 2, g.r * 2.3)
      }

      if (t > nextBolt) { flash = 1; nextBolt = t + rand(9, 22) }
      if (flash > 0) {
        const f = flash > 0.7 ? 1 : flash > 0.5 ? 0.2 : flash
        ctx.fillStyle = `rgba(200,210,255,${f * 0.22})`
        ctx.fillRect(0, 0, w, h)
        flash -= dt * 1.8
      }
      ctx.drawImage(vig, 0, 0, w, h)
    },
  }
}

/* ------------------------------------------------------- Ocean Sunset */

export const ocean: SceneFactory = (ctx, w, h, dpr) => {
  const hz = h * 0.58
  const sunX = w * 0.5, sunY = hz - h * 0.07, sunR = Math.min(w, h) * 0.07
  const sky = layer(w, h, dpr, (c) => {
    c.fillStyle = vgrad(c, 0, hz, [[0, '#1b1240'], [0.35, '#5a2a6e'], [0.72, '#c4507a'], [1, '#ffad6b']])
    c.fillRect(0, 0, w, hz + 2)
    const g = c.createRadialGradient(sunX, sunY, sunR * 0.5, sunX, sunY, sunR * 8)
    g.addColorStop(0, 'rgba(255,214,150,0.7)')
    g.addColorStop(0.3, 'rgba(255,150,120,0.25)')
    g.addColorStop(1, 'rgba(255,120,120,0)')
    c.fillStyle = g
    c.fillRect(0, 0, w, hz)
    c.fillStyle = '#ffe3b0'
    c.beginPath(); c.arc(sunX, sunY, sunR, 0, TAU); c.fill()
    // sea body
    c.fillStyle = vgrad(c, hz, h, [[0, '#8a3f6c'], [0.25, '#4a2357'], [1, '#120a26']])
    c.fillRect(0, hz, w, h - hz)
  })
  const clouds = Array.from({ length: 7 }, (_, i) => {
    const rnd = seeded(100 + i)
    const cw = rand(180, 420), ch = rand(24, 50)
    const img = layer(cw, ch * 2, dpr, (c) => {
      for (let k = 0; k < 22; k++) {
        c.fillStyle = `rgba(${pick(['255,170,170', '230,140,170', '255,200,170'])},${0.05 + rnd() * 0.08})`
        c.beginPath()
        // keep every ellipse inside the layer so cloud edges never clip
        c.ellipse(cw * (0.22 + rnd() * 0.56), ch * (0.85 + rnd() * 0.3), cw * (0.06 + rnd() * 0.14), ch * (0.2 + rnd() * 0.3), 0, 0, TAU)
        c.fill()
      }
    })
    return { img, cw, ch, x: rand(-cw, w), y: rand(h * 0.08, hz * 0.8), v: rand(3, 9) }
  })
  const bands = 10
  const colors = ['#9a4a74', '#86406c', '#723763', '#5f2e5a', '#4e2652', '#3f1f49', '#321840', '#271237', '#1d0d2e', '#150a26']
  return {
    draw(t, dt) {
      ctx.drawImage(sky, 0, 0, w, h)
      for (const c of clouds) {
        c.x += c.v * dt
        if (c.x > w + 10) c.x = -c.cw
        ctx.drawImage(c.img, c.x, c.y, c.cw, c.ch * 2)
      }
      for (let i = 0; i < bands; i++) {
        const p = i / bands
        const y0 = hz + (h - hz) * Math.pow(p, 1.5)
        const amp = 1.5 + p * 10
        const f = 0.012 - p * 0.008
        ctx.beginPath()
        ctx.moveTo(0, h)
        for (let x = 0; x <= w + 10; x += 10)
          ctx.lineTo(x, y0 + Math.sin(x * f + t * (0.6 + p) + i * 1.7) * amp + Math.sin(x * f * 2.3 - t * 0.9 + i) * amp * 0.35)
        ctx.lineTo(w, h)
        ctx.closePath()
        ctx.fillStyle = colors[i]
        ctx.globalAlpha = 0.85
        ctx.fill()
      }
      ctx.globalAlpha = 1
      // sun glitter on the water
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      for (let i = 0; i < 46; i++) {
        const p = i / 46
        const y = hz + 2 + (h - hz) * 0.8 * Math.pow(p, 1.3)
        const spread = sunR * (0.8 + p * 3.5)
        const a = Math.max(0, Math.sin(t * 2.5 + i * 1.73) * 0.5 + 0.2) * (1 - p) * 0.8
        const off = Math.sin(t * 0.8 + i * 2.1) * spread * 0.4
        ctx.fillStyle = `rgba(255,200,150,${a})`
        ctx.fillRect(sunX - spread * 0.5 + off, y, spread * (0.3 + 0.7 * Math.abs(Math.sin(i * 7.1))), 1.5 + p * 3)
      }
      ctx.restore()
    },
  }
}

/* ---------------------------------------------------------- Synthwave */

export const synthwave: SceneFactory = (ctx, w, h, dpr) => {
  const hz = h * 0.62
  const cx = w / 2
  const R = Math.min(w, h) * 0.22
  const sunY = hz - R * 0.55
  const bg = layer(w, h, dpr, (c) => {
    const rnd = seeded(77)
    c.fillStyle = vgrad(c, 0, hz, [[0, '#07001a'], [0.45, '#1f0540'], [0.8, '#5c0d66'], [1, '#c2186b']])
    c.fillRect(0, 0, w, hz)
    for (let i = 0; i < 260; i++) {
      c.fillStyle = `rgba(255,255,255,${rnd() * 0.8})`
      c.fillRect(rnd() * w, rnd() * hz * 0.7, rnd() * 1.6, rnd() * 1.6)
    }
    const g = c.createRadialGradient(cx, sunY, R * 0.6, cx, sunY, R * 2.6)
    g.addColorStop(0, 'rgba(255,90,170,0.45)')
    g.addColorStop(1, 'rgba(255,90,170,0)')
    c.fillStyle = g
    c.fillRect(0, 0, w, hz)
    c.fillStyle = '#0a0016'
    c.fillRect(0, hz, w, h - hz)
  })
  const mountains = layer(w, h, dpr, (c) => {
    const rnd = seeded(31)
    const pts = ridge(w, hz - h * 0.05, h * 0.16, rnd, 6).map(([x, y]) => [x, Math.min(hz, Math.abs(x - cx) < w * 0.17 ? hz - Math.abs(hz - y) * 0.3 : y)] as const)
    fillRidge(c, pts, hz, vgrad(c, hz - h * 0.2, hz, [[0, '#2a0548'], [1, '#12002a']]))
    c.strokeStyle = 'rgba(255,80,220,0.7)'
    c.lineWidth = 1.5
    c.shadowColor = '#ff4fd8'
    c.shadowBlur = 10
    c.beginPath()
    pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)))
    c.stroke()
  })
  const sunCanvas = document.createElement('canvas')
  sunCanvas.width = sunCanvas.height = Math.ceil(R * 2 * dpr)
  const sc = sunCanvas.getContext('2d')!
  sc.scale(dpr, dpr)

  return {
    draw(t) {
      ctx.drawImage(bg, 0, 0, w, h)
      // sun with scrolling cut-outs
      sc.globalCompositeOperation = 'source-over'
      sc.clearRect(0, 0, R * 2, R * 2)
      const g = sc.createLinearGradient(0, 0, 0, R * 2)
      g.addColorStop(0, '#ffe66d'); g.addColorStop(0.5, '#ff9a3c'); g.addColorStop(1, '#ff2d95')
      sc.fillStyle = g
      sc.beginPath(); sc.arc(R, R, R, 0, TAU); sc.fill()
      sc.globalCompositeOperation = 'destination-out'
      const off = (t * 10) % 22
      for (let y = R * 0.9 + off; y < R * 2; y += 22) sc.fillRect(0, y, R * 2, 3 + ((y - R) / R) * 7)
      ctx.save()
      ctx.beginPath(); ctx.rect(0, 0, w, hz); ctx.clip()
      ctx.drawImage(sunCanvas, cx - R, sunY - R, R * 2, R * 2)
      ctx.restore()
      ctx.drawImage(mountains, 0, 0, w, h)

      // perspective grid
      ctx.save()
      ctx.beginPath(); ctx.rect(0, hz, w, h - hz); ctx.clip()
      ctx.strokeStyle = '#ff3df2'
      ctx.shadowColor = '#ff3df2'
      ctx.shadowBlur = 8
      ctx.lineWidth = 1.4
      const D = h - hz
      ctx.beginPath()
      for (let i = -22; i <= 22; i++) {
        ctx.moveTo(cx + i * w * 0.012, hz)
        ctx.lineTo(cx + i * w * 0.14, h)
      }
      const phase = (t * 0.9) % 1
      for (let k = 0; k < 26; k++) {
        const z = 1 + k - phase
        if (z < 0.3) continue
        const y = hz + D / z
        ctx.moveTo(0, y); ctx.lineTo(w, y)
      }
      ctx.stroke()
      ctx.restore()
      const haze = ctx.createLinearGradient(0, hz - 20, 0, hz + D * 0.35)
      haze.addColorStop(0, 'rgba(255,60,160,0.5)')
      haze.addColorStop(1, 'rgba(255,60,160,0)')
      ctx.fillStyle = haze
      ctx.fillRect(0, hz - 20, w, D * 0.35 + 20)
    },
  }
}

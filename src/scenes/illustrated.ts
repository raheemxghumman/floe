import { layer, pick, rand, seeded, TAU, type SceneFactory } from './util'

/* ------------------------------------------------------ Pixel Valley */
// Painted at ~1/4 resolution and scaled up without smoothing for a crisp pixel-art look.

export const pixel: SceneFactory = (ctx, w, h) => {
  const P = Math.max(3, Math.round(Math.min(w, h) / 230))
  const lw = Math.ceil(w / P), lh = Math.ceil(h / P)
  const lo = document.createElement('canvas')
  lo.width = lw; lo.height = lh
  const c = lo.getContext('2d')!
  const rnd = seeded(61)

  const sky = layer(lw, lh, 1, (k) => {
    const bands = ['#5f86ad', '#6c93b8', '#7aa0c2', '#8aaecb', '#a3bfd3']
    bands.forEach((col, i) => { k.fillStyle = col; k.fillRect(0, Math.floor((i / bands.length) * lh * 0.6), lw, Math.ceil(lh * 0.6 / bands.length) + 1) })
    k.fillStyle = '#b7c9d4'; k.fillRect(0, Math.floor(lh * 0.6), lw, lh)
  })

  const land = layer(lw, lh, 1, (k) => {
    k.imageSmoothingEnabled = false
    const ridge = (base: number, amp: number, f: number, col: string, ph: number) => {
      k.fillStyle = col
      for (let x = 0; x < lw; x++) {
        const y = Math.floor(base + Math.sin(x * f + ph) * amp + Math.sin(x * f * 2.7 + ph * 2) * amp * 0.4)
        k.fillRect(x, y, 1, lh - y)
      }
    }
    ridge(lh * 0.6, lh * 0.03, 0.03, '#8b6f86', 1)
    ridge(lh * 0.64, lh * 0.025, 0.045, '#76788a', 2.2)
    ridge(lh * 0.68, lh * 0.02, 0.02, '#6b8a46', 0.4)
    ridge(lh * 0.72, lh * 0.018, 0.035, '#7d9c4c', 3)
    // striped fields
    for (let y = Math.floor(lh * 0.74); y < lh; y++) {
      k.fillStyle = (Math.floor(y / 3) % 2) ? '#6f9a41' : '#7ca94a'
      k.fillRect(0, y, lw, 1)
    }
    // lake
    k.fillStyle = '#5f86ab'
    for (let y = Math.floor(lh * 0.79); y < lh * 0.9; y++) {
      const p = (y - lh * 0.79) / (lh * 0.11)
      const half = Math.sin(p * Math.PI) * lw * 0.2
      k.fillRect(Math.floor(lw * 0.62 - half), y, Math.ceil(half * 2), 1)
    }
    // dirt path
    k.fillStyle = '#c8935b'
    for (let y = Math.floor(lh * 0.74); y < lh; y++) {
      const p = (y - lh * 0.74) / (lh * 0.26)
      const x = Math.floor(lw * (0.2 + Math.sin(p * 3) * 0.06 + p * 0.1))
      k.fillRect(x, y, Math.ceil(1 + p * 5), 1)
    }
    // bushes and flowers
    for (let i = 0; i < 140; i++) {
      const x = Math.floor(rnd() * lw), y = Math.floor(lh * (0.7 + rnd() * 0.3))
      k.fillStyle = pick(['#4f7a32', '#5a8a38', '#3f6628'])
      k.fillRect(x, y, 2 + Math.floor(rnd() * 3), 1 + Math.floor(rnd() * 2))
    }
    for (let i = 0; i < 90; i++) {
      k.fillStyle = pick(['#f2d36b', '#f4f0e8', '#e98aa0'])
      k.fillRect(Math.floor(rnd() * lw), Math.floor(lh * (0.76 + rnd() * 0.24)), 1, 1)
    }
  })

  const tones = ['#9c5f45', '#c98055', '#e3a066', '#f2c487', '#fbe0ae']
  const clouds = Array.from({ length: 9 }, (_, i) => ({
    x: rand(-lw * 0.2, lw), y: lh * (0.04 + (i % 5) * 0.1 + rand(-0.03, 0.03)), s: rand(0.7, 1.4), v: rand(1, 3),
    puffs: Array.from({ length: 9 }, () => ({ dx: rand(-26, 26), dy: rand(-6, 6), r: rand(7, 15) })),
  }))
  const birds = Array.from({ length: 4 }, () => ({ x: rand(0, lw), y: rand(lh * 0.15, lh * 0.45), v: rand(6, 12), ph: rand(0, TAU) }))

  return {
    draw(t, dt) {
      c.drawImage(sky, 0, 0)
      for (const cl of clouds) {
        cl.x += cl.v * dt
        if (cl.x - 40 * cl.s > lw) cl.x = -40 * cl.s
        for (let layerI = 0; layerI < tones.length; layerI++) {
          c.fillStyle = tones[layerI]
          for (const p of cl.puffs) {
            const r = Math.max(1, Math.round(p.r * cl.s * (1 - layerI * 0.16)))
            c.beginPath()
            c.arc(Math.round(cl.x + p.dx * cl.s - layerI * 0.8), Math.round(cl.y + p.dy * cl.s - layerI * 1.6 + 6 - layerI), r, 0, TAU)
            c.fill()
          }
        }
      }
      c.fillStyle = '#2b2430'
      for (const b of birds) {
        b.x += b.v * dt
        if (b.x > lw + 4) { b.x = -4; b.y = rand(lh * 0.15, lh * 0.45) }
        const flap = Math.sin(t * 8 + b.ph) > 0 ? 1 : 0
        c.fillRect(Math.round(b.x) - 2, Math.round(b.y) - flap, 2, 1)
        c.fillRect(Math.round(b.x) + 1, Math.round(b.y) - flap, 2, 1)
        c.fillRect(Math.round(b.x), Math.round(b.y), 1, 1)
      }
      c.drawImage(land, 0, 0)
      c.fillStyle = '#a9cbe6'
      for (let i = 0; i < 26; i++) {
        const seed = Math.floor(t * 2) * 97 + i * 31
        const x = Math.floor(lw * 0.47 + ((seed * 13) % Math.floor(lw * 0.3)))
        const y = Math.floor(lh * 0.8 + ((seed * 7) % Math.floor(lh * 0.08)))
        c.fillRect(x, y, 2, 1)
      }
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(lo, 0, 0, lw * P, lh * P)
      ctx.imageSmoothingEnabled = true
    },
  }
}

/* -------------------------------------------------------- Pastel Park */

function flatCloud(c: CanvasRenderingContext2D, x: number, y: number, s: number, col = '#ffffff') {
  c.fillStyle = col
  c.beginPath()
  c.ellipse(x, y, 60 * s, 18 * s, 0, 0, TAU)
  c.arc(x - 26 * s, y - 10 * s, 22 * s, 0, TAU)
  c.arc(x + 4 * s, y - 20 * s, 28 * s, 0, TAU)
  c.arc(x + 32 * s, y - 8 * s, 20 * s, 0, TAU)
  c.fill()
}

export const park: SceneFactory = (ctx, w, h, dpr) => {
  const rnd = seeded(91)
  const hz = h * 0.62
  const bg = layer(w, h, dpr, (c) => {
    const g = c.createLinearGradient(0, 0, 0, hz)
    g.addColorStop(0, '#cfe8fb'); g.addColorStop(1, '#fdf2e6')
    c.fillStyle = g; c.fillRect(0, 0, w, h)
    const sx = w * 0.78, sy = h * 0.2, sr = Math.min(w, h) * 0.07
    const halo = c.createRadialGradient(sx, sy, sr, sx, sy, sr * 4)
    halo.addColorStop(0, 'rgba(255,226,170,0.6)'); halo.addColorStop(1, 'rgba(255,226,170,0)')
    c.fillStyle = halo; c.fillRect(0, 0, w, h)
    c.fillStyle = '#ffe1a6'; c.beginPath(); c.arc(sx, sy, sr, 0, TAU); c.fill()
    const hill = (base: number, amp: number, f: number, col: string, ph: number) => {
      c.fillStyle = col; c.beginPath(); c.moveTo(0, h)
      for (let x = 0; x <= w; x += 8) c.lineTo(x, base + Math.sin(x * f + ph) * amp + Math.sin(x * f * 2.3 + ph) * amp * 0.3)
      c.lineTo(w, h); c.fill()
    }
    hill(hz - h * 0.04, h * 0.035, 0.004, '#c7e6c5', 1)
    hill(hz, h * 0.03, 0.006, '#a8d9a9', 2.5)
    // lake
    c.fillStyle = '#bfe1f4'
    c.beginPath(); c.ellipse(w * 0.36, hz + h * 0.1, w * 0.28, h * 0.06, 0, 0, TAU); c.fill()
    hill(hz + h * 0.16, h * 0.04, 0.005, '#8fcc95', 0.5)
    hill(hz + h * 0.26, h * 0.03, 0.007, '#79bd83', 4)
    for (let i = 0; i < 70; i++) {
      c.fillStyle = pick(['#ffffff', '#ffd1dc', '#fff2a8'])
      c.beginPath(); c.arc(rnd() * w, hz + h * (0.2 + rnd() * 0.18), 2 + rnd() * 2, 0, TAU); c.fill()
    }
  })
  const trees = Array.from({ length: 11 }, (_, i) => {
    const x = (i / 10) * w + rand(-30, 30)
    const near = i % 3 === 0
    return {
      x, base: hz + h * (near ? rand(0.2, 0.3) : rand(0.03, 0.12)), s: (near ? rand(1.1, 1.5) : rand(0.55, 0.85)) * Math.min(w, h) / 900,
      col: pick(['#6bbf7a', '#55ad69', '#f4a3b5', '#7fcf8e', '#f7b9c6']), ph: rand(0, TAU),
    }
  }).sort((a, b) => a.base - b.base)
  const clouds = Array.from({ length: 6 }, () => ({ x: rand(0, w), y: rand(h * 0.08, h * 0.38), s: rand(0.7, 1.4) * Math.min(w, h) / 900, v: rand(6, 14) }))
  const birds = Array.from({ length: 5 }, () => ({ x: rand(0, w), y: rand(h * 0.1, h * 0.35), v: rand(30, 50), ph: rand(0, TAU), s: rand(0.7, 1.2) }))
  const leaves = Array.from({ length: 16 }, () => ({ x: rand(0, w), y: rand(0, h), v: rand(15, 30), r: rand(0, TAU), col: pick(['#f4a3b5', '#9fd8a6', '#ffd1dc']) }))

  return {
    draw(t, dt) {
      ctx.drawImage(bg, 0, 0, w, h)
      for (const cl of clouds) {
        cl.x += cl.v * dt
        if (cl.x - 120 * cl.s > w) cl.x = -120 * cl.s
        flatCloud(ctx, cl.x, cl.y, cl.s)
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2
      for (let i = 0; i < 8; i++) {
        const y = hz + h * (0.07 + i * 0.008)
        const x = w * (0.2 + ((i * 0.13 + t * 0.02) % 0.32))
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 30, y); ctx.stroke()
      }
      for (const tr of trees) {
        const sway = Math.sin(t * 0.8 + tr.ph) * 2.5 * tr.s
        ctx.fillStyle = '#9a6b4f'
        ctx.fillRect(tr.x - 4 * tr.s, tr.base - 60 * tr.s, 8 * tr.s, 60 * tr.s)
        ctx.fillStyle = tr.col
        ctx.beginPath()
        ctx.arc(tr.x + sway, tr.base - 82 * tr.s, 38 * tr.s, 0, TAU)
        ctx.arc(tr.x - 24 * tr.s + sway * 0.8, tr.base - 62 * tr.s, 24 * tr.s, 0, TAU)
        ctx.arc(tr.x + 26 * tr.s + sway * 0.8, tr.base - 64 * tr.s, 24 * tr.s, 0, TAU)
        ctx.fill()
        ctx.fillStyle = 'rgba(255,255,255,0.25)'
        ctx.beginPath(); ctx.arc(tr.x - 12 * tr.s + sway, tr.base - 96 * tr.s, 12 * tr.s, 0, TAU); ctx.fill()
      }
      ctx.strokeStyle = '#3a3a4a'; ctx.lineWidth = 1.6; ctx.lineCap = 'round'
      for (const b of birds) {
        b.x += b.v * dt
        if (b.x > w + 20) { b.x = -20; b.y = rand(h * 0.1, h * 0.35) }
        const f = Math.sin(t * 7 + b.ph) * 4 * b.s
        ctx.beginPath(); ctx.moveTo(b.x - 7 * b.s, b.y - f); ctx.quadraticCurveTo(b.x - 3 * b.s, b.y - 2, b.x, b.y)
        ctx.quadraticCurveTo(b.x + 3 * b.s, b.y - 2, b.x + 7 * b.s, b.y - f); ctx.stroke()
      }
      for (const l of leaves) {
        l.y += l.v * dt; l.x += Math.sin(t + l.r) * 12 * dt; l.r += dt
        if (l.y > h + 10) { l.y = -10; l.x = rand(0, w) }
        ctx.save(); ctx.translate(l.x, l.y); ctx.rotate(l.r); ctx.fillStyle = l.col
        ctx.beginPath(); ctx.ellipse(0, 0, 5, 2.5, 0, 0, TAU); ctx.fill(); ctx.restore()
      }
    },
  }
}

/* ----------------------------------------------------------- Cozy Cat */

export const cozy: SceneFactory = (ctx, w, h, dpr) => {
  const ink = '#3b3646'
  const floor = h * 0.72
  const u = Math.min(w, h) / 900
  const win = { x: w * 0.1, y: h * 0.14, w: Math.min(w * 0.26, 380 * u * 1.4), h: h * 0.42 }
  const cat = { x: w * 0.68, y: floor + h * 0.12 }
  const room = layer(w, h, dpr, (c) => {
    c.fillStyle = '#fbf1e4'; c.fillRect(0, 0, w, floor)
    c.fillStyle = '#f0d9c0'; c.fillRect(0, floor, w, h - floor)
    c.strokeStyle = ink; c.lineWidth = 2.5 * u
    c.beginPath(); c.moveTo(0, floor); c.lineTo(w, floor); c.stroke()
    // shelf with books + plant
    const sx = w * 0.62, sy = h * 0.26, sw = w * 0.26
    c.fillStyle = '#e2c09a'; c.fillRect(sx, sy, sw, 10 * u)
    c.strokeRect(sx, sy, sw, 10 * u)
    const books = ['#f4a3b5', '#8fb8e8', '#f6d36b', '#9fd8a6', '#c7a6f0', '#f49b7a']
    let bx = sx + 14 * u
    books.forEach((col, i) => {
      const bw = (14 + (i % 3) * 5) * u, bh = (60 + ((i * 17) % 30)) * u
      c.fillStyle = col; c.fillRect(bx, sy - bh, bw, bh); c.strokeRect(bx, sy - bh, bw, bh)
      bx += bw + 3 * u
    })
    const px = sx + sw - 50 * u
    c.fillStyle = '#e98a6b'; c.beginPath(); c.moveTo(px - 22 * u, sy); c.lineTo(px + 22 * u, sy); c.lineTo(px + 16 * u, sy - 36 * u); c.lineTo(px - 16 * u, sy - 36 * u); c.closePath(); c.fill(); c.stroke()
    c.fillStyle = '#7cc48a'
    for (let i = 0; i < 6; i++) {
      c.save(); c.translate(px, sy - 36 * u); c.rotate(-1.3 + i * 0.5)
      c.beginPath(); c.ellipse(0, -26 * u, 9 * u, 26 * u, 0, 0, TAU); c.fill(); c.stroke(); c.restore()
    }
    // rug
    c.fillStyle = '#f5b7b1'
    c.beginPath(); c.ellipse(cat.x, cat.y + 20 * u, 190 * u, 46 * u, 0, 0, TAU); c.fill(); c.stroke()
    c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 3 * u
    c.beginPath(); c.ellipse(cat.x, cat.y + 20 * u, 160 * u, 34 * u, 0, 0, TAU); c.stroke()
    // scribble decor
    c.strokeStyle = '#e8b7a8'; c.lineWidth = 2 * u
    c.beginPath(); c.moveTo(w * 0.45, h * 0.08); c.bezierCurveTo(w * 0.55, h * 0.02, w * 0.5, h * 0.2, w * 0.6, h * 0.12); c.stroke()
  })
  const clouds = Array.from({ length: 3 }, (_, i) => ({ x: win.x + rand(0, win.w), y: win.y + win.h * (0.2 + i * 0.22), v: rand(6, 12) }))
  const zs: { x: number; y: number; life: number }[] = []
  let nextZ = 0

  return {
    draw(t, dt) {
      ctx.drawImage(room, 0, 0, w, h)
      // window with drifting clouds
      ctx.save()
      ctx.beginPath(); ctx.roundRect(win.x, win.y, win.w, win.h, 18 * u); ctx.clip()
      const g = ctx.createLinearGradient(0, win.y, 0, win.y + win.h)
      g.addColorStop(0, '#a9d6fb'); g.addColorStop(1, '#e6f4ff')
      ctx.fillStyle = g; ctx.fillRect(win.x, win.y, win.w, win.h)
      for (const cl of clouds) {
        cl.x += cl.v * dt
        if (cl.x > win.x + win.w + 80 * u) cl.x = win.x - 80 * u
        flatCloud(ctx, cl.x, cl.y, 0.6 * u)
      }
      ctx.restore()
      ctx.strokeStyle = ink; ctx.lineWidth = 3 * u
      ctx.beginPath(); ctx.roundRect(win.x, win.y, win.w, win.h, 18 * u); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(win.x + win.w / 2, win.y); ctx.lineTo(win.x + win.w / 2, win.y + win.h)
      ctx.moveTo(win.x, win.y + win.h / 2); ctx.lineTo(win.x + win.w, win.y + win.h / 2); ctx.stroke()
      // sunbeam
      ctx.fillStyle = `rgba(255,230,170,${0.16 + Math.sin(t * 0.4) * 0.04})`
      ctx.beginPath(); ctx.moveTo(win.x + win.w, win.y + win.h * 0.1); ctx.lineTo(win.x + win.w, win.y + win.h)
      ctx.lineTo(cat.x + 160 * u, h); ctx.lineTo(cat.x - 60 * u, h); ctx.fill()

      // cat: tail swish, breathing body, sleepy face
      const breathe = 1 + Math.sin(t * 1.6) * 0.03
      ctx.lineWidth = 2.6 * u; ctx.strokeStyle = ink; ctx.lineJoin = 'round'; ctx.lineCap = 'round'
      ctx.save(); ctx.translate(cat.x + 70 * u, cat.y + 4 * u); ctx.rotate(Math.sin(t * 1.2) * 0.25)
      ctx.fillStyle = '#9a96a6'
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(50 * u, -10 * u, 70 * u, -50 * u, 40 * u, -70 * u)
      ctx.lineWidth = 16 * u; ctx.strokeStyle = '#9a96a6'; ctx.stroke()
      ctx.lineWidth = 2.6 * u; ctx.strokeStyle = ink; ctx.restore()
      ctx.save(); ctx.translate(cat.x, cat.y); ctx.scale(1, breathe)
      ctx.fillStyle = '#9a96a6'
      ctx.beginPath(); ctx.ellipse(0, -16 * u, 90 * u, 46 * u, 0, 0, TAU); ctx.fill(); ctx.stroke()
      ctx.fillStyle = '#b6b2c2'; ctx.beginPath(); ctx.ellipse(-10 * u, -2 * u, 60 * u, 22 * u, 0, 0, Math.PI); ctx.fill()
      ctx.restore()
      const hx = cat.x - 74 * u, hy = cat.y - 26 * u
      ctx.fillStyle = '#9a96a6'
      ctx.beginPath(); ctx.moveTo(hx - 30 * u, hy - 14 * u); ctx.lineTo(hx - 24 * u, hy - 50 * u); ctx.lineTo(hx - 4 * u, hy - 26 * u); ctx.closePath(); ctx.fill(); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(hx + 6 * u, hy - 28 * u); ctx.lineTo(hx + 22 * u, hy - 52 * u); ctx.lineTo(hx + 30 * u, hy - 14 * u); ctx.closePath(); ctx.fill(); ctx.stroke()
      ctx.beginPath(); ctx.ellipse(hx, hy, 40 * u, 32 * u, 0, 0, TAU); ctx.fill(); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(hx - 22 * u, hy); ctx.quadraticCurveTo(hx - 15 * u, hy + 6 * u, hx - 8 * u, hy)
      ctx.moveTo(hx + 8 * u, hy); ctx.quadraticCurveTo(hx + 15 * u, hy + 6 * u, hx + 22 * u, hy); ctx.stroke()
      ctx.fillStyle = '#f4a3b5'; ctx.beginPath(); ctx.arc(hx, hy + 10 * u, 3.5 * u, 0, TAU); ctx.fill()
      // floating z's
      if (t > nextZ) { zs.push({ x: hx + 30 * u, y: hy - 40 * u, life: 0 }); nextZ = t + 1.8 }
      ctx.fillStyle = ink; ctx.textAlign = 'center'
      for (let i = zs.length - 1; i >= 0; i--) {
        const z = zs[i]
        z.life += dt * 0.35
        if (z.life >= 1) { zs.splice(i, 1); continue }
        ctx.globalAlpha = Math.sin(z.life * Math.PI)
        ctx.font = `700 ${Math.round((14 + z.life * 14) * u)}px Inter, sans-serif`
        ctx.fillText('z', z.x + Math.sin(z.life * 6) * 8 * u + z.life * 30 * u, z.y - z.life * 70 * u)
      }
      ctx.globalAlpha = 1
    },
  }
}

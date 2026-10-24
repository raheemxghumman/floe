export interface SceneInstance { draw(t: number, dt: number): void }
export type SceneFactory = (ctx: CanvasRenderingContext2D, w: number, h: number, dpr: number) => SceneInstance

export const rand = (a: number, b: number) => a + Math.random() * (b - a)
export const pick = <T,>(arr: readonly T[]) => arr[Math.floor(Math.random() * arr.length)]
export const TAU = Math.PI * 2

/** Deterministic PRNG so static layers look the same after a resize. */
export function seeded(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Offscreen canvas painted once in CSS-pixel coordinates. */
export function layer(w: number, h: number, dpr: number, paint: (c: CanvasRenderingContext2D) => void) {
  const cv = document.createElement('canvas')
  cv.width = Math.max(1, Math.ceil(w * dpr))
  cv.height = Math.max(1, Math.ceil(h * dpr))
  const c = cv.getContext('2d')!
  c.scale(dpr, dpr)
  paint(c)
  return cv
}

export function hexA(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

const glowCache = new Map<string, HTMLCanvasElement>()
/** Soft radial sprite; draw with drawImage for cheap glows. */
export function glow(hex: string, r = 32) {
  const key = hex + r
  let cv = glowCache.get(key)
  if (!cv) {
    cv = document.createElement('canvas')
    cv.width = cv.height = r * 2
    const c = cv.getContext('2d')!
    const g = c.createRadialGradient(r, r, 0, r, r, r)
    g.addColorStop(0, hexA(hex, 1))
    g.addColorStop(0.25, hexA(hex, 0.55))
    g.addColorStop(1, hexA(hex, 0))
    c.fillStyle = g
    c.fillRect(0, 0, r * 2, r * 2)
    glowCache.set(key, cv)
  }
  return cv
}

export function vgrad(c: CanvasRenderingContext2D, y0: number, y1: number, stops: [number, string][]) {
  const g = c.createLinearGradient(0, y0, 0, y1)
  for (const [o, col] of stops) g.addColorStop(o, col)
  return g
}

/** Mountain ridge via midpoint displacement → array of y values across width. */
export function ridge(w: number, base: number, rough: number, rnd: () => number, steps = 8) {
  const n = 2 ** steps
  const ys = new Array<number>(n + 1)
  ys[0] = base + (rnd() - 0.5) * rough
  ys[n] = base + (rnd() - 0.5) * rough
  let amp = rough
  for (let size = n; size > 1; size /= 2) {
    for (let i = size / 2; i < n; i += size) ys[i] = (ys[i - size / 2] + ys[i + size / 2]) / 2 + (rnd() - 0.5) * amp
    amp *= 0.55
  }
  return ys.map((y, i) => [(i / n) * w, y] as const)
}

export function fillRidge(c: CanvasRenderingContext2D, pts: readonly (readonly [number, number])[], h: number, fill: string | CanvasGradient) {
  c.beginPath()
  c.moveTo(0, h)
  for (const [x, y] of pts) c.lineTo(x, y)
  c.lineTo(pts[pts.length - 1][0], h)
  c.closePath()
  c.fillStyle = fill
  c.fill()
}

export function vignette(w: number, h: number, dpr: number, strength = 0.55) {
  return layer(w, h, dpr, (c) => {
    const g = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75)
    g.addColorStop(0, 'rgba(0,0,0,0)')
    g.addColorStop(1, `rgba(0,0,0,${strength})`)
    c.fillStyle = g
    c.fillRect(0, 0, w, h)
  })
}

export function pineTree(c: CanvasRenderingContext2D, x: number, base: number, height: number, color: string, snow?: string) {
  const tiers = 5
  const w = height * 0.42
  c.fillStyle = color
  c.fillRect(x - height * 0.02, base - height * 0.15, height * 0.04, height * 0.15)
  for (let i = 0; i < tiers; i++) {
    const p = i / tiers
    const top = base - height + p * height * 0.78
    const bot = top + height * 0.36
    const tw = w * (0.35 + p * 0.65)
    c.beginPath()
    c.moveTo(x, top)
    c.lineTo(x + tw / 2, bot)
    c.lineTo(x - tw / 2, bot)
    c.closePath()
    c.fillStyle = color
    c.fill()
    if (snow) {
      c.beginPath()
      c.moveTo(x, top)
      c.lineTo(x + tw * 0.22, top + height * 0.12)
      c.lineTo(x - tw * 0.18, top + height * 0.1)
      c.closePath()
      c.fillStyle = snow
      c.fill()
    }
  }
}

import type { AlarmSound } from '../store'

let ctx: AudioContext | null = null
export function audioCtx() {
  if (!ctx) ctx = new AudioContext()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

/* ---------------------------------------------------------------- alarms */

function tone(
  ac: AudioContext, out: AudioNode, freq: number, at: number, dur: number,
  type: OscillatorType = 'sine', peak = 0.4,
) {
  const o = ac.createOscillator()
  const g = ac.createGain()
  o.type = type
  o.frequency.value = freq
  g.gain.setValueAtTime(0, at)
  g.gain.linearRampToValueAtTime(peak, at + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur)
  o.connect(g).connect(out)
  o.start(at)
  o.stop(at + dur + 0.05)
}

export function playAlarm(sound: AlarmSound, volume: number) {
  if (sound === 'none') return
  const ac = audioCtx()
  const out = ac.createGain()
  out.gain.value = volume
  out.connect(ac.destination)
  const t = ac.currentTime + 0.05

  switch (sound) {
    case 'bell':
      // inharmonic partials make it read as struck metal
      for (let i = 0; i < 3; i++) {
        const at = t + i * 1.1
        for (const [ratio, amp] of [[1, 0.35], [2.76, 0.12], [5.4, 0.06], [0.5, 0.1]] as const)
          tone(ac, out, 660 * ratio, at, 2.2, 'sine', amp)
      }
      break
    case 'chime':
      ;[523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(ac, out, f, t + i * 0.18, 1.6, 'triangle', 0.25))
      ;[523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(ac, out, f, t + 1.6 + i * 0.18, 1.6, 'triangle', 0.2))
      break
    case 'digital':
      for (let r = 0; r < 3; r++)
        for (let i = 0; i < 4; i++) tone(ac, out, 1760, t + r * 0.9 + i * 0.12, 0.08, 'square', 0.08)
      break
    case 'soft':
      ;[392, 493.88, 587.33].forEach((f, i) => tone(ac, out, f, t + i * 0.35, 2.4, 'sine', 0.22))
      break
    case 'sparkle':
      // quick shimmering run up the scale
      ;[1318.5, 1568, 1975.5, 2637, 3136, 2637, 3951].forEach((f, i) => tone(ac, out, f, t + i * 0.07, 0.9, 'sine', 0.12))
      ;[1318.5, 1975.5, 2637].forEach((f, i) => tone(ac, out, f, t + 0.9 + i * 0.07, 1.1, 'triangle', 0.08))
      break
    case 'marimba':
      ;[523.25, 659.25, 783.99, 659.25, 1046.5].forEach((f, i) => {
        tone(ac, out, f, t + i * 0.16, 0.5, 'sine', 0.3)
        tone(ac, out, f * 4, t + i * 0.16, 0.12, 'sine', 0.05)
      })
      break
    case 'gong':
      for (const [ratio, amp] of [[1, 0.3], [1.48, 0.15], [2.31, 0.1], [3.1, 0.05]] as const) tone(ac, out, 98 * ratio, t, 5.5, 'sine', amp)
      break
    case 'kalimba':
      ;[587.33, 880, 739.99, 987.77, 1174.66].forEach((f, i) => {
        tone(ac, out, f, t + i * 0.22, 1.4, 'sine', 0.22)
        tone(ac, out, f * 2.01, t + i * 0.22, 0.4, 'sine', 0.05)
      })
      break
    case 'birds':
      for (let i = 0; i < 6; i++) {
        const at = t + i * 0.18 + (i > 2 ? 0.4 : 0)
        const o = ac.createOscillator(), g = ac.createGain()
        o.frequency.setValueAtTime(2600 + (i % 3) * 400, at)
        o.frequency.exponentialRampToValueAtTime(4200 + (i % 2) * 600, at + 0.07)
        o.frequency.exponentialRampToValueAtTime(2400, at + 0.12)
        g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(0.12, at + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.14)
        o.connect(g).connect(out); o.start(at); o.stop(at + 0.2)
      }
      break
    case 'arcade':
      ;[523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5, 1318.5].forEach((f, i) => tone(ac, out, f, t + i * 0.09, 0.12, 'square', 0.07))
      break
  }
}

/* ------------------------------------------------------- ambient mixer */

export type AmbientId = 'rain' | 'waves' | 'wind' | 'fire' | 'birds' | 'white' | 'pink' | 'brown'

function noiseBuffer(ac: AudioContext, kind: 'white' | 'pink' | 'brown', seconds = 4) {
  const len = ac.sampleRate * seconds
  const buf = ac.createBuffer(2, len, ac.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch)
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1
      if (kind === 'white') d[i] = w * 0.5
      else if (kind === 'pink') {
        // Paul Kellet's refined pink filter
        b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759
        b2 = 0.969 * b2 + w * 0.153852; b3 = 0.8665 * b3 + w * 0.3104856
        b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11
        b6 = w * 0.115926
      } else {
        last = (last + 0.02 * w) / 1.02
        d[i] = last * 3.5
      }
    }
  }
  return buf
}

const bufCache: Partial<Record<'white' | 'pink' | 'brown', AudioBuffer>> = {}
function loopNoise(ac: AudioContext, kind: 'white' | 'pink' | 'brown') {
  const src = ac.createBufferSource()
  src.buffer = bufCache[kind] ??= noiseBuffer(ac, kind)
  src.loop = true
  src.start()
  return src
}

function lfo(ac: AudioContext, target: AudioParam, freq: number, depth: number) {
  const o = ac.createOscillator()
  const g = ac.createGain()
  o.frequency.value = freq
  g.gain.value = depth
  o.connect(g).connect(target)
  o.start()
  return o
}

interface Voice { gain: GainNode; stop: () => void }

function build(id: AmbientId, ac: AudioContext, out: GainNode): () => void {
  const nodes: (AudioScheduledSourceNode)[] = []
  const timers: number[] = []
  const filter = (type: BiquadFilterType, freq: number, q = 0.7) => {
    const f = ac.createBiquadFilter()
    f.type = type; f.frequency.value = freq; f.Q.value = q
    return f
  }

  switch (id) {
    case 'white':
    case 'pink':
    case 'brown': {
      const src = loopNoise(ac, id)
      const g = ac.createGain(); g.gain.value = id === 'white' ? 0.35 : 0.6
      src.connect(g).connect(out); nodes.push(src)
      break
    }
    case 'rain': {
      const src = loopNoise(ac, 'pink')
      const hp = filter('highpass', 450), lp = filter('lowpass', 7000)
      const g = ac.createGain(); g.gain.value = 0.9
      src.connect(hp).connect(lp).connect(g).connect(out)
      nodes.push(src, lfo(ac, g.gain, 0.13, 0.12))
      // individual drops pattering on a surface
      const drop = () => {
        const t = ac.currentTime
        const s = ac.createBufferSource(); s.buffer = bufCache.white ??= noiseBuffer(ac, 'white')
        const bp = filter('bandpass', 2500 + Math.random() * 3500, 4)
        const e = ac.createGain()
        e.gain.setValueAtTime(0.25 * Math.random(), t)
        e.gain.exponentialRampToValueAtTime(0.0001, t + 0.04)
        s.connect(bp).connect(e).connect(out)
        s.start(t, Math.random() * 3, 0.06)
        timers.push(window.setTimeout(drop, 20 + Math.random() * 90))
        if (timers.length > 50) timers.splice(0, 40)
      }
      drop()
      break
    }
    case 'waves': {
      const src = loopNoise(ac, 'brown')
      const lp = filter('lowpass', 700)
      const g = ac.createGain(); g.gain.value = 0.45
      src.connect(lp).connect(g).connect(out)
      nodes.push(src, lfo(ac, g.gain, 0.09, 0.4), lfo(ac, lp.frequency, 0.09, 450))
      break
    }
    case 'wind': {
      const src = loopNoise(ac, 'pink')
      const bp = filter('bandpass', 500, 1.2)
      const g = ac.createGain(); g.gain.value = 0.9
      src.connect(bp).connect(g).connect(out)
      nodes.push(src, lfo(ac, bp.frequency, 0.05, 300), lfo(ac, g.gain, 0.07, 0.35))
      break
    }
    case 'fire': {
      const src = loopNoise(ac, 'brown')
      const lp = filter('lowpass', 380)
      const g = ac.createGain(); g.gain.value = 0.7
      src.connect(lp).connect(g).connect(out); nodes.push(src)
      const crackle = () => {
        const t = ac.currentTime
        const n = 1 + Math.floor(Math.random() * 3)
        for (let i = 0; i < n; i++) {
          const s = ac.createBufferSource(); s.buffer = bufCache.white ??= noiseBuffer(ac, 'white')
          const hp = filter('highpass', 1500 + Math.random() * 2000)
          const e = ac.createGain()
          const at = t + i * 0.015
          e.gain.setValueAtTime(0.5 * Math.random() + 0.1, at)
          e.gain.exponentialRampToValueAtTime(0.0001, at + 0.02 + Math.random() * 0.03)
          s.connect(hp).connect(e).connect(out)
          s.start(at, Math.random() * 3, 0.06)
        }
        timers.push(window.setTimeout(crackle, 60 + Math.random() * 400))
        if (timers.length > 50) timers.splice(0, 40)
      }
      crackle()
      break
    }
    case 'birds': {
      const chirp = () => {
        const t = ac.currentTime
        const base = 2200 + Math.random() * 2200
        const notes = 1 + Math.floor(Math.random() * 4)
        const pan = ac.createStereoPanner(); pan.pan.value = Math.random() * 1.6 - 0.8
        pan.connect(out)
        for (let i = 0; i < notes; i++) {
          const at = t + i * (0.09 + Math.random() * 0.05)
          const o = ac.createOscillator(); const e = ac.createGain()
          o.frequency.setValueAtTime(base, at)
          o.frequency.exponentialRampToValueAtTime(base * (1.3 + Math.random() * 0.5), at + 0.06)
          o.frequency.exponentialRampToValueAtTime(base * 0.9, at + 0.1)
          e.gain.setValueAtTime(0, at)
          e.gain.linearRampToValueAtTime(0.06, at + 0.01)
          e.gain.exponentialRampToValueAtTime(0.0001, at + 0.11)
          o.connect(e).connect(pan); o.start(at); o.stop(at + 0.15)
        }
        timers.push(window.setTimeout(chirp, 400 + Math.random() * 2600))
        if (timers.length > 50) timers.splice(0, 40)
      }
      chirp()
      break
    }
  }
  return () => {
    nodes.forEach((n) => { try { n.stop() } catch { /* already stopped */ } })
    timers.forEach(clearTimeout)
  }
}

const voices = new Map<AmbientId, Voice>()
const listeners = new Set<() => void>()
const levels = new Map<AmbientId, number>()

export const ambient = {
  level: (id: AmbientId) => levels.get(id) ?? 0,
  active: () => [...levels.keys()],
  subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn) } },
  set(id: AmbientId, vol: number) {
    const ac = audioCtx()
    if (vol <= 0) {
      const v = voices.get(id)
      if (v) {
        v.gain.gain.setTargetAtTime(0, ac.currentTime, 0.2)
        window.setTimeout(v.stop, 900)
        voices.delete(id)
      }
      levels.delete(id)
    } else {
      let v = voices.get(id)
      if (!v) {
        const gain = ac.createGain()
        gain.gain.value = 0
        gain.connect(ac.destination)
        const stop = build(id, ac, gain)
        v = { gain, stop: () => { stop(); gain.disconnect() } }
        voices.set(id, v)
      }
      v.gain.gain.setTargetAtTime(vol, ac.currentTime, 0.25)
      levels.set(id, vol)
    }
    listeners.forEach((l) => l())
  },
  stopAll() { for (const id of [...levels.keys()]) ambient.set(id, 0) },
}

import { useEffect, useRef, useState, type RefObject } from 'react'
import { SCENES, type SceneId } from '../scenes'
import { createOverlay, type Fx } from '../scenes/overlays'
import { ShaderRenderer, type ShaderLook } from '../shaders/renderer'
import { resolveTheme, type ThemeDef } from '../themes'
import { useStore } from '../store'
import { mediaUrl } from '../lib/media'

/**
 * One animation loop for every canvas-based theme: sizes the canvas, pauses when the tab is hidden,
 * and renders a single still frame when motion is reduced or animated themes are turned off.
 */
function useAnimLoop(
  ref: RefObject<HTMLCanvasElement>,
  setup: (cv: HTMLCanvasElement, w: number, h: number) => (t: number, dt: number) => void,
  deps: unknown[],
  scale: (dpr: number) => number = (dpr) => Math.min(dpr, 1.5),
) {
  const still = useStore((s) => s.settings.perf.staticThemes)
  useEffect(() => {
    const cv = ref.current!
    let draw: (t: number, dt: number) => void = () => {}
    let raf = 0, last = performance.now(), t = 6
    const freeze = still || window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const init = () => {
      const w = cv.clientWidth || 1, h = cv.clientHeight || 1
      const k = scale(window.devicePixelRatio || 1)
      cv.width = Math.max(1, Math.round(w * k)); cv.height = Math.max(1, Math.round(h * k))
      draw = setup(cv, w, h)
      draw(t, 0.016)
    }
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now; t += dt
      draw(t, dt)
      raf = requestAnimationFrame(loop)
    }
    try { init() } catch { return }
    if (!freeze) raf = requestAnimationFrame(loop)
    let rt = 0
    const ro = new ResizeObserver(() => { clearTimeout(rt); rt = window.setTimeout(() => { try { init() } catch { /* context lost */ } }, 120) })
    ro.observe(cv)
    const vis = () => {
      cancelAnimationFrame(raf)
      if (!document.hidden && !freeze) { last = performance.now(); raf = requestAnimationFrame(loop) }
    }
    document.addEventListener('visibilitychange', vis)
    return () => { cancelAnimationFrame(raf); clearTimeout(rt); ro.disconnect(); document.removeEventListener('visibilitychange', vis) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, still])
}

export function CanvasScene({ id }: { id: SceneId }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useAnimLoop(ref, (cv, w, h) => {
    const ctx = cv.getContext('2d')!
    const dpr = cv.width / w
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const scene = SCENES[id](ctx, w, h, dpr)
    return (t, dt) => { ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; scene.draw(t, dt) }
  }, [id])
  return <canvas ref={ref} className="bg-fill" />
}

/** GPU shader themes. Rendered at reduced resolution: gradients are smooth, so it looks identical and costs far less. */
export function ShaderScene({ look }: { look: ShaderLook }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const [failed, setFailed] = useState(false)
  const renderer = useRef<ShaderRenderer | null>(null)
  useEffect(() => {
    // if the GPU drops the context (driver reset, too many tabs), show the CSS gradient instead of gray
    const cv = ref.current
    const lost = (e: Event) => { e.preventDefault(); setFailed(true) }
    cv?.addEventListener('webglcontextlost', lost)
    return () => { cv?.removeEventListener('webglcontextlost', lost); renderer.current?.dispose(); renderer.current = null }
  }, [])
  useAnimLoop(ref, (cv) => {
    try {
      if (!renderer.current || renderer.current.gl.isContextLost()) renderer.current = new ShaderRenderer(cv)
      if (renderer.current.gl.isContextLost()) throw new Error('context lost')
    } catch { setFailed(true); return () => {} }
    const r = renderer.current
    return (t) => r.draw(look, t)
  }, [look], () => Math.min(0.6, 1280 / Math.max(window.innerWidth, 1)))
  if (failed) return <div className="bg-fill" style={{ background: `linear-gradient(135deg, ${look.colors.join(', ')})` }} />
  return <canvas ref={ref} className="bg-fill shader-canvas" />
}

/** Transparent canvas of living effects drawn over a photo. */
function Overlay({ fx }: { fx: Fx[] }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useAnimLoop(ref, (cv, w, h) => {
    const ctx = cv.getContext('2d')!
    const dpr = cv.width / w
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const layer = createOverlay(ctx, w, h, fx)
    return (t, dt) => layer.draw(t, dt)
  }, [fx], (dpr) => Math.min(dpr, 1.25))
  return <canvas ref={ref} className="bg-fill overlay-canvas" />
}

export function PhotoBg({ theme }: { theme: Extract<ThemeDef, { kind: 'photo' }> }) {
  const [loaded, setLoaded] = useState(false)
  const still = useStore((s) => s.settings.perf.staticThemes)
  return (
    <div className="bg-fill photo-bg">
      <img className={`bg-fill media ${still ? '' : 'drift'} ${loaded ? 'in' : ''}`} src={theme.src} alt="" onLoad={() => setLoaded(true)} style={{ objectPosition: theme.focus ?? 'center' }} />
      {theme.fx.length > 0 && <Overlay fx={theme.fx} />}
    </div>
  )
}

export function GradientBg({ theme }: { theme: Extract<ThemeDef, { kind: 'gradient' }> }) {
  return (
    <div className="bg-fill grad" style={{ background: theme.base }}>
      {theme.blobs.map((c, i) => (
        <div key={i} className={`blob b${i + 1}`} style={{ background: `radial-gradient(circle, ${c} 0%, transparent 68%)` }} />
      ))}
      <div className="grain" />
    </div>
  )
}

/** Flat paper colors with slowly morphing organic blobs (sized in %, so it also works in thumbnails). */
export function FlatBg({ theme }: { theme: Extract<ThemeDef, { kind: 'flat' }> }) {
  return (
    <div className="bg-fill flat" style={{ background: theme.base }}>
      {theme.blobs.map((c, i) => <div key={i} className={`fblob f${i + 1}`} style={{ background: c }} />)}
    </div>
  )
}

function YouTubeBg({ id, sound }: { id: string; sound: boolean }) {
  const params = new URLSearchParams({
    autoplay: '1', mute: sound ? '0' : '1', controls: '0', loop: '1', playlist: id,
    modestbranding: '1', rel: '0', iv_load_policy: '3', disablekb: '1', playsinline: '1', fs: '0',
  })
  return (
    <div className="bg-fill yt-wrap">
      <iframe
        className="yt-bg"
        src={`https://www.youtube-nocookie.com/embed/${id}?${params}`}
        allow="autoplay; encrypted-media; picture-in-picture"
        title="Background stream"
        tabIndex={-1}
      />
    </div>
  )
}

function MediaBg({ theme }: { theme: Extract<ThemeDef, { kind: 'image' | 'video' }> }) {
  const [src, setSrc] = useState<string | null>(theme.local ? null : theme.src)
  useEffect(() => {
    if (theme.local) void mediaUrl(theme.src).then(setSrc)
    else setSrc(theme.src)
  }, [theme.src, theme.local])
  if (!src) return <div className="bg-fill" style={{ background: '#0b0b12' }} />
  return theme.kind === 'video'
    ? <video className="bg-fill media" src={src} autoPlay muted loop playsInline />
    : <img className="bg-fill media kenburns" src={src} alt="" />
}

function ThemeLayer({ theme }: { theme: ThemeDef }) {
  const sound = useStore((s) => s.settings.streamSound)
  switch (theme.kind) {
    case 'gradient': return <GradientBg theme={theme} />
    case 'flat': return <FlatBg theme={theme} />
    case 'scene': return <CanvasScene id={theme.scene} />
    case 'shader': return <ShaderScene look={theme.look} />
    case 'photo': return <PhotoBg theme={theme} />
    case 'youtube': return <YouTubeBg id={theme.videoId} sound={sound} />
    default: return <MediaBg theme={theme} />
  }
}

/** Cross-fades between themes and adds a subtle mouse-parallax depth shift. */
export function Background() {
  const view = useStore((s) => s.view)
  const themeId = useStore((s) => s.settings.themes[s.view])
  const custom = useStore((s) => s.settings.customThemes)
  const dim = useStore((s) => s.settings.dim)
  const [layers, setLayers] = useState<string[]>([themeId])

  useEffect(() => {
    setLayers((prev) => (prev[prev.length - 1] === themeId ? prev : [...prev.filter((x) => x !== themeId), themeId].slice(-2)))
    const t = window.setTimeout(() => setLayers([themeId]), 1400)
    return () => clearTimeout(t)
  }, [themeId])

  return (
    <div className={`bg-root view-${view}`} aria-hidden>
      <div className="bg-parallax">
        {layers.map((id) => (
          <div key={id} className="bg-layer">
            <ThemeLayer theme={resolveTheme(id, custom)} />
          </div>
        ))}
      </div>
      {/* light themes need far less darkening to keep their pastel look */}
      <div className="bg-dim" style={{ opacity: resolveTheme(themeId, custom).tone === 'light' ? dim * 0.25 : dim }} />
    </div>
  )
}

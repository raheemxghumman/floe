import { useEffect, useRef, useState } from 'react'
import { SCENES, type SceneId } from '../scenes'
import { resolveTheme, type ThemeDef } from '../themes'
import { useStore } from '../store'
import { mediaUrl } from '../lib/media'

export function CanvasScene({ id, paused = false }: { id: SceneId; paused?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const pausedRef = useRef(paused)
  pausedRef.current = paused

  useEffect(() => {
    const cv = ref.current!
    const ctx = cv.getContext('2d')!
    let scene: ReturnType<(typeof SCENES)[SceneId]>
    let raf = 0
    let last = performance.now()
    let t = 0
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const setup = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      const w = cv.clientWidth || 1, h = cv.clientHeight || 1
      cv.width = Math.round(w * dpr)
      cv.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      scene = SCENES[id](ctx, w, h, dpr)
      scene.draw(t, 0.016)
    }
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      if (!pausedRef.current) {
        t += dt
        ctx.globalAlpha = 1
        ctx.globalCompositeOperation = 'source-over'
        scene.draw(t, dt)
      }
      raf = requestAnimationFrame(loop)
    }
    setup()
    if (!reduce) raf = requestAnimationFrame(loop)

    let rt = 0
    const ro = new ResizeObserver(() => { clearTimeout(rt); rt = window.setTimeout(setup, 120) })
    ro.observe(cv)
    const vis = () => {
      cancelAnimationFrame(raf)
      if (!document.hidden && !reduce) { last = performance.now(); raf = requestAnimationFrame(loop) }
    }
    document.addEventListener('visibilitychange', vis)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(rt)
      ro.disconnect()
      document.removeEventListener('visibilitychange', vis)
    }
  }, [id])

  return <canvas ref={ref} className="bg-fill" />
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

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Check, Link, Upload, X } from 'lucide-react'
import { useStore, type ViewMode } from '../../store'
import { FLAT_THEMES, GRADIENT_THEMES, SCENE_THEMES, STREAM_THEMES, gradientCss, resolveTheme, type ThemeDef } from '../../themes'
import { FlatBg } from '../Background'
import { sceneThumb } from '../../scenes'
import { deleteMedia, mediaUrl, saveMedia, youtubeId } from '../../lib/media'
import { toast } from '../../hooks'
import { Row, Section, Seg, Toggle } from './controls'

/** Card that tilts toward the pointer in 3D. */
export function TiltCard({ children, className = '', onClick, selected }: { children: ReactNode; className?: string; onClick?: () => void; selected?: boolean }) {
  const ref = useRef<HTMLButtonElement>(null)
  const move = (e: React.PointerEvent) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5
    const y = (e.clientY - r.top) / r.height - 0.5
    el.style.setProperty('--rx', `${(-y * 10).toFixed(2)}deg`)
    el.style.setProperty('--ry', `${(x * 12).toFixed(2)}deg`)
    el.style.setProperty('--gx', `${(x + 0.5) * 100}%`)
    el.style.setProperty('--gy', `${(y + 0.5) * 100}%`)
  }
  const leave = () => {
    ref.current?.style.setProperty('--rx', '0deg')
    ref.current?.style.setProperty('--ry', '0deg')
  }
  return (
    <button ref={ref} className={`tilt-card ${selected ? 'selected' : ''} ${className}`} onPointerMove={move} onPointerLeave={leave} onClick={onClick}>
      {children}
      <span className="tilt-shine" />
    </button>
  )
}

function useSceneThumbs() {
  const [thumbs, setThumbs] = useState<Record<string, string>>({})
  useEffect(() => {
    let cancelled = false
    let i = 0
    const next = () => {
      if (cancelled || i >= SCENE_THEMES.length) return
      const t = SCENE_THEMES[i++]
      if (t.kind === 'scene') {
        const url = sceneThumb(t.scene)
        setThumbs((m) => ({ ...m, [t.id]: url }))
      }
      window.setTimeout(next, 16)
    }
    window.setTimeout(next, 120)
    return () => { cancelled = true }
  }, [])
  return thumbs
}

function LocalThumb({ theme }: { theme: Extract<ThemeDef, { kind: 'image' | 'video' }> }) {
  const [src, setSrc] = useState<string | null>(theme.local ? null : theme.src)
  useEffect(() => { if (theme.local) void mediaUrl(theme.src).then(setSrc) }, [theme])
  if (!src) return <div className="thumb" />
  return theme.kind === 'video'
    ? <video className="thumb" src={src} muted loop autoPlay playsInline />
    : <img className="thumb" src={src} alt="" />
}

/** Some 24/7 streams have no published thumbnail, so fall back to a styled tile. */
function YtThumb({ id }: { id: string }) {
  const [failed, setFailed] = useState(false)
  if (failed) return <div className="thumb yt-fallback" />
  return <img className="thumb" src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" loading="lazy" onError={() => setFailed(true)} />
}

export function ThemesSection() {
  const target = useStore((s) => s.themeTarget)
  const current = useStore((s) => s.settings.themes[s.themeTarget])
  const custom = useStore((s) => s.settings.customThemes)
  const dim = useStore((s) => s.settings.dim)
  const streamSound = useStore((s) => s.settings.streamSound)
  const { setTheme, setThemeTarget, addCustomTheme, removeCustomTheme, update, setView } = useStore.getState()
  const thumbs = useSceneThumbs()
  const [url, setUrl] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const choose = (id: string) => { setTheme(target, id); setView(target) }

  const addUrl = (e: React.FormEvent) => {
    e.preventDefault()
    const s = url.trim()
    if (!s) return
    const yt = youtubeId(s)
    let id: string
    if (yt) id = addCustomTheme({ name: 'YouTube stream', kind: 'youtube', src: yt })
    else if (/^https?:\/\//.test(s)) id = addCustomTheme({ name: s.split('/').pop()?.split('?')[0] || 'Custom', kind: /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(s) ? 'video' : 'image', src: s })
    else { toast('Paste an image, video or YouTube URL'); return }
    choose(id); setUrl('')
  }

  const upload = async (f: File | undefined) => {
    if (!f) return
    const kind = f.type.startsWith('video') ? 'video' : f.type.startsWith('image') ? 'image' : null
    if (!kind) { toast('Pick an image or video file'); return }
    const key = 'm-' + Date.now()
    try {
      await saveMedia(key, f)
      choose(addCustomTheme({ name: f.name.replace(/\.[^.]+$/, ''), kind, src: key, local: true }))
    } catch { toast('Could not store that file') }
  }

  const remove = (id: string) => {
    const t = custom.find((c) => c.id === id)
    if (t?.local) void deleteMedia(t.src)
    removeCustomTheme(id)
  }

  const card = (t: ThemeDef, thumb: ReactNode, badge?: string, extra?: ReactNode) => (
    <div className="theme-cell" key={t.id}>
      <TiltCard selected={current === t.id} onClick={() => choose(t.id)}>
        {thumb}
        {badge && <span className="theme-badge">{badge}</span>}
        {current === t.id && <span className="theme-check"><Check size={13} strokeWidth={3} /></span>}
        <span className="theme-name">{t.name}</span>
      </TiltCard>
      {extra}
    </div>
  )

  return (
    <>
      <Section title="Themes" sub="Every mode can have its own world. Pick where you want to apply it.">
        <div className="theme-target">
          <span className="muted small">Applying to</span>
          <Seg<ViewMode>
            value={target}
            onChange={setThemeTarget}
            options={[{ v: 'ambient', label: 'Ambient' }, { v: 'home', label: 'Home' }, { v: 'focus', label: 'Focus' }]}
          />
          <span className="muted small now-using">Now: {resolveTheme(current, custom).name}</span>
        </div>
      </Section>

      <Section title="Live scenes" sub="Hand-built animated worlds, drawn live in your browser.">
        <div className="theme-grid">
          {SCENE_THEMES.map((t) =>
            card(t, thumbs[t.id] ? <img className="thumb" src={thumbs[t.id]} alt="" /> : <div className="thumb shimmer" />, t.tone === 'light' ? 'LIVE · LIGHT' : 'LIVE'))}
        </div>
      </Section>

      <Section title="Gradients" sub="Slow, drifting color fields with film grain.">
        <div className="theme-grid">
          {GRADIENT_THEMES.map((t) =>
            card(t, <div className="thumb grad-thumb" style={{ background: t.kind === 'gradient' ? gradientCss(t) : undefined }} />))}
        </div>
      </Section>

      <Section title="Paper" sub="Calm flat colors with soft, slowly shifting shapes. Light ones switch the text to dark.">
        <div className="theme-grid">
          {FLAT_THEMES.map((t) => card(t, t.kind === 'flat' ? <div className="thumb"><FlatBg theme={t} /></div> : null, t.tone === 'light' ? 'LIGHT' : undefined))}
        </div>
      </Section>

      <Section title="Lofi streams" sub="24/7 live YouTube streams as your background.">
        <div className="theme-grid">
          {STREAM_THEMES.map((t) =>
            card(t, <YtThumb id={t.kind === 'youtube' ? t.videoId : ''} />, 'STREAM'))}
        </div>
        <Row label="Stream audio" hint="Play the YouTube stream’s sound too">
          <Toggle on={streamSound} onChange={(v) => update({ streamSound: v })} />
        </Row>
      </Section>

      <Section title="Your own" sub="Use any image, looping video or YouTube link. Uploads stay on this device.">
        <form className="inline-form" onSubmit={addUrl}>
          <Link size={15} className="muted" />
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://… image, .mp4 or YouTube link" />
          <button className="btn sm" type="submit">Add</button>
          <button className="btn sm ghost" type="button" onClick={() => fileRef.current?.click()}><Upload size={14} /> Upload</button>
          <input ref={fileRef} type="file" accept="image/*,video/*" hidden onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = '' }} />
        </form>
        {custom.length > 0 && (
          <div className="theme-grid">
            {custom.map((c) => {
              const t = resolveTheme(c.id, custom)
              const thumb = t.kind === 'youtube'
                ? <YtThumb id={t.videoId} />
                : t.kind === 'image' || t.kind === 'video' ? <LocalThumb theme={t} /> : null
              return card(t, thumb, c.kind.toUpperCase(),
                <button className="theme-remove" onClick={() => remove(c.id)} aria-label="Remove theme"><X size={12} /></button>)
            })}
          </div>
        )}
      </Section>

      <Section title="Background">
        <Row label="Dim" hint="Darken the background so text stays readable">
          <div className="range-wrap">
            <input type="range" min={0} max={0.7} step={0.01} value={dim} onChange={(e) => update({ dim: Number(e.target.value) })} style={{ ['--v' as string]: dim / 0.7 }} />
            <span className="muted small">{Math.round(dim * 100)}%</span>
          </div>
        </Row>
      </Section>
    </>
  )
}

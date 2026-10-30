import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronDown, ChevronRight, ImagePlus, Link, X } from 'lucide-react'
import { useNow, useStore, type ViewMode } from '../../store'
import { CATEGORIES, LIBRARY, gradientCss, inCategory, resolveTheme, type Category, type ThemeDef } from '../../themes'
import { sceneThumb } from '../../scenes'
import { shaderThumb } from '../../shaders/renderer'
import { deleteMedia, mediaUrl, saveMedia, youtubeId } from '../../lib/media'
import { toast } from '../../hooks'
import { Row, Section, Seg, Toggle } from './controls'
import { FlatBg } from '../Background'

/* ---------------------------------------------------------- tilt card */

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
  const leave = () => { ref.current?.style.setProperty('--rx', '0deg'); ref.current?.style.setProperty('--ry', '0deg') }
  return (
    <button ref={ref} className={`tilt-card ${selected ? 'selected' : ''} ${className}`} onPointerMove={move} onPointerLeave={leave} onClick={onClick}>
      {children}
      <span className="tilt-shine" />
    </button>
  )
}

/* -------------------------------------------------------- thumbnails */

// Canvas/shader thumbnails are rendered one at a time, only once a card scrolls into view.
const queue: (() => void)[] = []
let pumping = false
function pump() {
  if (pumping) return
  pumping = true
  const step = () => {
    const job = queue.shift()
    if (!job) { pumping = false; return }
    job()
    window.setTimeout(step, 24)
  }
  step()
}

function useVisible<T extends Element>() {
  const ref = useRef<T>(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    if (!ref.current || seen) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect() } }, { rootMargin: '300px' })
    io.observe(ref.current)
    return () => io.disconnect()
  }, [seen])
  return [ref, seen] as const
}

function LocalThumb({ theme }: { theme: Extract<ThemeDef, { kind: 'image' | 'video' }> }) {
  const [src, setSrc] = useState<string | null>(theme.local ? null : theme.src)
  useEffect(() => { if (theme.local) void mediaUrl(theme.src).then(setSrc) }, [theme])
  if (!src) return <div className="thumb shimmer" />
  return theme.kind === 'video' ? <video className="thumb" src={src} muted loop autoPlay playsInline /> : <img className="thumb" src={src} alt="" />
}

function YtThumb({ id }: { id: string }) {
  const [failed, setFailed] = useState(false)
  if (failed) return <div className="thumb yt-fallback" />
  return <img className="thumb" src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" loading="lazy" onError={() => setFailed(true)} />
}

/** Picture for any theme kind; `big` renders a sharper version for the preview card. */
export function ThemeThumb({ theme, big }: { theme: ThemeDef; big?: boolean }) {
  const [ref, seen] = useVisible<HTMLDivElement>()
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!seen || (theme.kind !== 'scene' && theme.kind !== 'shader')) return
    let live = true
    const [w, h] = big ? [640, 360] : [320, 180]
    queue.push(() => {
      const u = theme.kind === 'scene' ? sceneThumb(theme.scene, w, h) : shaderThumb(`${theme.id}-${w}`, theme.look, w, h)
      if (live) setUrl(u)
    })
    pump()
    return () => { live = false }
  }, [seen, theme, big])

  let inner: ReactNode
  switch (theme.kind) {
    case 'photo': inner = <img className="thumb" src={big ? theme.src : theme.thumb} alt="" loading="lazy" style={{ objectPosition: theme.focus }} />; break
    case 'gradient': inner = <div className="thumb" style={{ background: gradientCss(theme) }} />; break
    case 'flat': inner = <div className="thumb"><FlatBg theme={theme} /></div>; break
    case 'youtube': inner = <YtThumb id={theme.videoId} />; break
    case 'image': case 'video': inner = <LocalThumb theme={theme} />; break
    default: inner = url ? <img className="thumb" src={url} alt="" /> : <div className="thumb shimmer" />
  }
  return <div ref={ref} className="thumb-wrap">{inner}</div>
}

/* ------------------------------------------------------------- cards */

const isLive = (t: ThemeDef) => t.cats?.includes('animated') || (t.kind === 'photo' && t.fx.length > 0)

function LibCard({ theme, selected, onPick, onRemove }: { theme: ThemeDef; selected: boolean; onPick: () => void; onRemove?: () => void }) {
  const credit = theme.kind === 'photo' && theme.credit ? `Photo: ${theme.credit.author} · ${theme.credit.license}` : undefined
  return (
    <div className="lib-cell">
      <button className={`lib-card ${selected ? 'on' : ''}`} onClick={onPick} title={credit}>
        <ThemeThumb theme={theme} />
        {isLive(theme) && <span className="lib-badge">LIVE</span>}
      </button>
      <span className="lib-name">{theme.name}</span>
      {onRemove && <button className="lib-remove" onClick={onRemove} aria-label="Remove"><X size={12} /></button>}
    </div>
  )
}

/* ------------------------------------------------------------ section */

type LibTab = 'all' | 'custom' | Category

export function ThemesSection() {
  const target = useStore((s) => s.themeTarget)
  const current = useStore((s) => s.settings.themes[s.themeTarget])
  const custom = useStore((s) => s.settings.customThemes)
  const dim = useStore((s) => s.settings.dim)
  const streamSound = useStore((s) => s.settings.streamSound)
  const format = useStore((s) => s.settings.clock.format)
  const minute = useNow((s) => Math.floor(s.now / 60_000))
  const { setTheme, setThemeTarget, addCustomTheme, removeCustomTheme, update, setView } = useStore.getState()
  const [tab, setTab] = useState<LibTab>('all')
  const [openCustom, setOpenCustom] = useState(true)
  const [drag, setDrag] = useState(false)
  const [yt, setYt] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const libRef = useRef<HTMLDivElement>(null)

  const theme = resolveTheme(current, custom)
  const choose = (id: string) => { setTheme(target, id); setView(target) }
  const d = new Date(minute * 60_000)
  const clock = format === '24' ? `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` : `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')}`

  const upload = async (f: File | undefined) => {
    if (!f) return
    const kind = f.type.startsWith('video') ? 'video' : f.type.startsWith('image') ? 'image' : null
    if (!kind) { toast('Pick an image or video file'); return }
    if (f.size > 60 * 1024 * 1024) { toast('That file is over 60 MB'); return }
    const key = 'm-' + Date.now()
    try { await saveMedia(key, f); choose(addCustomTheme({ name: f.name.replace(/\.[^.]+$/, '').slice(0, 28), kind, src: key, local: true })) }
    catch { toast('Could not store that file') }
  }
  const addYt = (e: React.FormEvent) => {
    e.preventDefault()
    const id = youtubeId(yt.trim())
    if (!id) { toast('That doesn’t look like a YouTube link'); return }
    const vids = custom.filter((c) => c.kind === 'youtube')
    if (vids.length >= 5) { toast('You can save up to 5 videos. Remove one first.'); return }
    choose(addCustomTheme({ name: `Video ${vids.length + 1}`, kind: 'youtube', src: id }))
    setYt('')
  }
  const remove = (id: string) => {
    const t = custom.find((c) => c.id === id)
    if (t?.local) void deleteMedia(t.src)
    removeCustomTheme(id)
  }
  const pick = (c: LibTab) => { setTab(c); libRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }

  const customDefs = custom.map((c) => resolveTheme(c.id, custom))
  const card = (t: ThemeDef, removable = false) => (
    <LibCard key={t.id} theme={t} selected={current === t.id} onPick={() => choose(t.id)} onRemove={removable ? () => remove(t.id) : undefined} />
  )

  return (
    <>
      <Section title="Themes" sub="Pick your theme for each mode.">
        <Seg<ViewMode> value={target} onChange={setThemeTarget} options={[{ v: 'home', label: 'Home' }, { v: 'focus', label: 'Focus' }, { v: 'ambient', label: 'Ambient' }]} />
        <div className="theme-preview" key={theme.id}>
          <ThemeThumb theme={theme} big />
          <span className="tp-clock">{clock}</span>
          <span className="tp-name">{theme.name}</span>
        </div>
      </Section>

      <div className="t-card">
        <button className="t-card-head" onClick={() => setOpenCustom(!openCustom)} aria-expanded={openCustom}>
          <span><strong>Custom Background</strong><span className="muted small">Upload your own image or looping video. It stays on this device.</span></span>
          <ChevronDown size={18} className={openCustom ? 'rot' : ''} />
        </button>
        {openCustom && (
          <div className="t-card-body">
            <div
              className={`dropzone ${drag ? 'over' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => { e.preventDefault(); setDrag(false); void upload(e.dataTransfer.files?.[0]) }}
              onClick={() => fileRef.current?.click()}
              role="button" tabIndex={0}
            >
              <ImagePlus size={22} />
              <strong>Drop a file here or <u>browse</u></strong>
              <span className="muted small">JPG, PNG, WEBP, GIF or MP4 / WEBM video (max 60 MB)</span>
              <input ref={fileRef} type="file" accept="image/*,video/*" hidden onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = '' }} />
            </div>
            <div className="yt-block">
              <strong>Video Backgrounds</strong>
              <span className="muted small">Save up to 5 YouTube videos and apply them from the library below.</span>
              <form className="inline-form" onSubmit={addYt}>
                <Link size={15} className="muted" />
                <input value={yt} onChange={(e) => setYt(e.target.value)} placeholder="Paste a YouTube URL" />
                <button className="btn sm" type="submit">Add</button>
              </form>
            </div>
          </div>
        )}
      </div>

      <div className="t-card" ref={libRef}>
        <div className="t-card-head static"><span><strong>Theme Library <em className="new-badge">NEW</em></strong></span></div>
        <div className="t-card-body">
          <div className="lib-chips">
            <button className={tab === 'all' ? 'on' : ''} onClick={() => pick('all')}>All</button>
            {CATEGORIES.filter((c) => inCategory(c.id).length).map((c) => <button key={c.id} className={tab === c.id ? 'on' : ''} onClick={() => pick(c.id)}>{c.label}</button>)}
            {customDefs.length > 0 && <button className={tab === 'custom' ? 'on' : ''} onClick={() => pick('custom')}>Yours</button>}
          </div>

          {tab === 'all' ? (
            <>
              {customDefs.length > 0 && (
                <div className="lib-row">
                  <div className="lib-row-head"><h4>Your backgrounds</h4></div>
                  <div className="lib-scroll">{customDefs.map((t) => card(t, true))}</div>
                </div>
              )}
              {CATEGORIES.map((c) => {
                const list = inCategory(c.id)
                if (!list.length) return null
                return (
                  <div className="lib-row" key={c.id}>
                    <div className="lib-row-head">
                      <h4>{c.label}</h4>
                      <button className="text-btn" onClick={() => pick(c.id)}>See all ({list.length}) <ChevronRight size={13} /></button>
                    </div>
                    <div className="lib-scroll">{list.slice(0, 10).map((t) => card(t))}</div>
                  </div>
                )
              })}
            </>
          ) : (
            <>
              <h4 className="lib-grid-title">{tab === 'custom' ? 'Your backgrounds' : CATEGORIES.find((c) => c.id === tab)?.label}</h4>
              <div className="lib-grid">{tab === 'custom' ? customDefs.map((t) => card(t, true)) : inCategory(tab).map((t) => card(t))}</div>
            </>
          )}
        </div>
      </div>

      <Section title="Background">
        <Row label="Dim" hint="Darken the background so text stays readable">
          <div className="range-wrap">
            <input type="range" min={0} max={0.7} step={0.01} value={dim} onChange={(e) => update({ dim: Number(e.target.value) })} style={{ ['--v' as string]: dim / 0.7 }} />
            <span className="muted small">{Math.round(dim * 100)}%</span>
          </div>
        </Row>
        <Row label="Video sound" hint="Play the sound of YouTube backgrounds too">
          <Toggle on={streamSound} onChange={(v) => update({ streamSound: v })} />
        </Row>
      </Section>

      <PhotoCredits />
    </>
  )
}

function PhotoCredits() {
  const [open, setOpen] = useState(false)
  const photos = LIBRARY.filter((t): t is Extract<ThemeDef, { kind: 'photo' }> => t.kind === 'photo' && !!t.credit)
  if (!photos.length) return null
  return (
    <div className="t-card">
      <button className="t-card-head" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span><strong>Photo credits</strong><span className="muted small">Photo themes use free-licensed images. Thank you to these photographers.</span></span>
        <ChevronDown size={18} className={open ? 'rot' : ''} />
      </button>
      {open && (
        <ul className="credits t-card-body">
          {photos.map((t) => (
            <li key={t.id}><strong>{t.name}</strong> · <a href={t.credit!.url} target="_blank" rel="noreferrer">“{t.credit!.title}”</a> by {t.credit!.author} · {t.credit!.license}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

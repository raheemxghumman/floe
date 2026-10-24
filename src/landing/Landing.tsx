import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowRight, ArrowUpRight, Check, CloudRain, Flame, Play, Plus, Waves, Wind } from 'lucide-react'
import '../styles/app.css'
import './landing.css'
import { Hero3D } from './Hero3D'
import { CanvasScene, GradientBg } from '../components/Background'
import { FlipCard } from '../components/views'
import { SpotifyGlyph } from '../components/panels/MusicPanel'
import { GRADIENT_THEMES, SCENE_THEMES, type ThemeDef } from '../themes'
import { sceneThumb, type SceneId } from '../scenes'
import { ambient, type AmbientId } from '../lib/audio'
import { useParallax } from '../hooks'

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))

function useLandingFx() {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target) } }),
      { threshold: 0.15, rootMargin: '0px 0px -6% 0px' },
    )
    document.querySelectorAll('[data-reveal]').forEach((el) => io.observe(el))
    let raf = 0
    const update = () => {
      raf = 0
      const vh = window.innerHeight
      document.querySelectorAll<HTMLElement>('[data-scroll]').forEach((el) => {
        const r = el.getBoundingClientRect()
        el.style.setProperty('--sp', clamp((vh - r.top) / (vh * 0.85), 0, 1).toFixed(3))
      })
      document.querySelectorAll<HTMLElement>('[data-manifesto]').forEach((el) => {
        const r = el.getBoundingClientRect()
        el.style.setProperty('--p', clamp((vh * 0.78 - r.top) / (r.height * 0.85), 0, 1).toFixed(3))
      })
      document.documentElement.classList.toggle('scrolled', window.scrollY > 24)
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      io.disconnect()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [])
}

/** Fake pomodoro that counts down from 24:59 for demos. */
function useDemoCountdown(start = 25 * 60 - 1) {
  const [s, setS] = useState(start)
  useEffect(() => {
    const id = window.setInterval(() => setS((v) => (v <= 0 ? start : v - 1)), 1000)
    return () => clearInterval(id)
  }, [start])
  return { mm: String(Math.floor(s / 60)).padStart(2, '0'), ss: String(s % 60).padStart(2, '0') }
}

function useInView<T extends Element>(margin = '200px') {
  const ref = useRef<T>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin: margin })
    if (ref.current) io.observe(ref.current)
    return () => io.disconnect()
  }, [margin])
  return [ref, inView] as const
}

function Tilt({ children, className = '', max = 8 }: { children: ReactNode; className?: string; max?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  return (
    <div
      ref={ref}
      className={`tilt3d ${className}`}
      onPointerMove={(e) => {
        const el = ref.current!
        const r = el.getBoundingClientRect()
        const x = (e.clientX - r.left) / r.width - 0.5
        const y = (e.clientY - r.top) / r.height - 0.5
        el.style.setProperty('--rx', `${(-y * max).toFixed(2)}deg`)
        el.style.setProperty('--ry', `${(x * max * 1.2).toFixed(2)}deg`)
        el.style.setProperty('--gx', `${(x + 0.5) * 100}%`)
        el.style.setProperty('--gy', `${(y + 0.5) * 100}%`)
      }}
      onPointerLeave={() => { ref.current?.style.setProperty('--rx', '0deg'); ref.current?.style.setProperty('--ry', '0deg') }}
    >
      {children}
    </div>
  )
}

/* ================================================================ sections */

function Nav() {
  return (
    <header className="l-nav">
      <a href="/" className="l-logo">floe</a>
      <nav>
        <a href="#scenes">Scenes</a>
        <a href="#features">Features</a>
        <a href="#faq">FAQ</a>
      </nav>
      <a href="/app" className="l-nav-cta">Open floe <ArrowUpRight size={15} /></a>
    </header>
  )
}

function Hero() {
  const { mm, ss } = useDemoCountdown()
  const twilight = GRADIENT_THEMES[0] as Extract<ThemeDef, { kind: 'gradient' }>
  return (
    <section className="hero">
      <div className="hero-bg"><GradientBg theme={twilight} /></div>
      <Hero3D />
      <div className="hero-copy">
        <p className="eyebrow"><span className="live-dot" /> A pomodoro timer with a view</p>
        <h1 className="hero-title">
          <span className="line"><span>A quiet room</span></span>
          <span className="line"><span>for <em>loud</em> minds.</span></span>
        </h1>
        <p className="lede">
          floe is a focus timer that lives inside slow, moving worlds. Pick a scene, put on a playlist, press start. That’s the whole trick.
        </p>
        <div className="hero-ctas">
          <a className="cta" href="/app"><span className="cta-face">Start focusing <ArrowRight size={18} /></span></a>
          <a className="cta-link" href="#scenes">See the scenes</a>
        </div>
        <p className="fine">Free · no sign-up · runs in your browser</p>
      </div>
      <div className="float-card fc-timer" style={{ ['--z' as string]: 1.4 }}>
        <span className="fc-k">Focus</span>
        <span className="fc-time">{mm}:{ss}</span>
      </div>
      <div className="float-card fc-music" style={{ ['--z' as string]: 0.8 }}>
        <SpotifyGlyph size={18} />
        <span><b>Lofi Beats</b><i>playing</i></span>
        <span className="eq"><i /><i /><i /><i /></span>
      </div>
      <div className="float-card fc-scene" style={{ ['--z' as string]: 1.1 }}>
        <CloudRain size={15} /> Rainy City <em>LIVE</em>
      </div>
      <a href="#scenes" className="scroll-cue" aria-label="Scroll down"><span /></a>
    </section>
  )
}

const SHOWCASE: SceneId[] = ['forest', 'rain', 'aurora', 'synthwave', 'snow', 'ocean', 'stars', 'sakura']

function Showcase() {
  const [scene, setScene] = useState<SceneId>('forest')
  const [ref, inView] = useInView<HTMLDivElement>()
  const { mm, ss } = useDemoCountdown(24 * 60 + 13)
  const name = SCENE_THEMES.find((t) => t.id === scene)?.name
  return (
    <section className="showcase" id="scenes">
      <div className="sec-head" data-reveal>
        <span className="kicker">01 · The room</span>
        <h2>Your desk, <em>somewhere else.</em></h2>
        <p>Eight hand-built scenes, drawn live in your browser. Not stock videos on a loop. Fireflies drift, rain slides down glass, the aurora actually moves.</p>
      </div>
      <div className="device-wrap" data-scroll ref={ref}>
        <div className="device">
          <div className="device-bar"><i /><i /><i /><span>floe · ambient</span></div>
          <div className="device-screen">
            {inView && <CanvasScene key={scene} id={scene} />}
            <div className="mock-logo">floe</div>
            <div className="mock-timer"><b>FOCUS</b><span>{mm}:{ss}</span><Play size={16} /></div>
            <div className="mock-tools"><i /><i /><i /></div>
            <div className="mock-dock"><i className="on" /><i /><i /></div>
            <div className="mock-name" key={name}>{name}</div>
          </div>
        </div>
      </div>
      <div className="scene-tabs" data-reveal>
        {SHOWCASE.map((id) => (
          <button key={id} className={id === scene ? 'on' : ''} onClick={() => setScene(id)}>
            {SCENE_THEMES.find((t) => t.id === id)?.name}
          </button>
        ))}
      </div>
    </section>
  )
}

const MANIFESTO = 'Most productivity apps want more of your attention. floe wants less. No feeds, no confetti, no streak to babysit. Just a clock, a room you like being in, and the thing you sat down to do.'

function Manifesto() {
  const words = MANIFESTO.split(' ')
  return (
    <section className="manifesto" data-manifesto style={{ ['--n' as string]: words.length }}>
      <p>
        {words.map((w, i) => (
          <span key={i} style={{ ['--i' as string]: i }} className={w === 'less.' ? 'hl' : ''}>{w} </span>
        ))}
      </p>
    </section>
  )
}

/* ---------------------------------------------------------- bento */

function FlipDemo() {
  const { mm, ss } = useDemoCountdown()
  return (
    <div className="flip-demo">
      <FlipCard value={mm} />
      <FlipCard value={ss} />
    </div>
  )
}

const DEMO_TASKS = ['Outline the essay', 'Reply to Sam', 'Fix the login bug', 'Read chapter 4']
function TasksDemo() {
  const [n, setN] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setN((v) => (v + 1) % (DEMO_TASKS.length + 2)), 1400)
    return () => clearInterval(id)
  }, [])
  return (
    <ul className="tasks-demo">
      {DEMO_TASKS.map((t, i) => (
        <li key={t} className={i < n ? 'done' : ''}>
          <span className="tick"><Check size={11} strokeWidth={3} /></span>
          <span className="tt">{t}</span>
        </li>
      ))}
    </ul>
  )
}

const DEMO_SOUNDS: { id: AmbientId; label: string; icon: typeof CloudRain }[] = [
  { id: 'rain', label: 'Rain', icon: CloudRain },
  { id: 'waves', label: 'Waves', icon: Waves },
  { id: 'fire', label: 'Fire', icon: Flame },
  { id: 'wind', label: 'Wind', icon: Wind },
]
function SoundsDemo() {
  const [on, setOn] = useState<Set<AmbientId>>(new Set())
  useEffect(() => () => ambient.stopAll(), [])
  const toggle = (id: AmbientId) => {
    const next = new Set(on)
    if (next.has(id)) { next.delete(id); ambient.set(id, 0) } else { next.add(id); ambient.set(id, 0.45) }
    setOn(next)
  }
  return (
    <div className="sounds-demo">
      {DEMO_SOUNDS.map(({ id, label, icon: Icon }) => (
        <button key={id} className={on.has(id) ? 'on' : ''} onClick={() => toggle(id)}>
          <Icon size={18} />
          <span>{label}</span>
          <span className="eq"><i /><i /><i /></span>
        </button>
      ))}
    </div>
  )
}

function HeatDemo() {
  // illustrative pattern, deterministic
  const cells = Array.from({ length: 7 * 44 }, (_, i) => {
    const v = (Math.sin(i * 12.9898) * 43758.5453) % 1
    const x = Math.abs(v) * (0.4 + (i / 308) * 0.9)
    return x < 0.25 ? 0 : x < 0.45 ? 1 : x < 0.65 ? 2 : x < 0.85 ? 3 : 4
  })
  return (
    <div className="heat-demo">
      {cells.map((l, i) => <i key={i} className={`l${l}`} style={{ ['--d' as string]: `${Math.floor(i / 7) * 18 + (i % 7) * 12}ms` }} />)}
    </div>
  )
}

function Bento() {
  return (
    <section className="bento-sec" id="features">
      <div className="sec-head" data-reveal>
        <span className="kicker">02 · The tools</span>
        <h2>Everything on the desk, <em>nothing in the way.</em></h2>
      </div>
      <div className="bento">
        <Tilt className="b-card b-flip" max={5}>
          <div data-reveal className="b-in">
            <h3>A clock worth looking at</h3>
            <p>Classic, or a split-flap that flips in real 3D. Set your own focus and break lengths.</p>
            <FlipDemo />
          </div>
        </Tilt>
        <Tilt className="b-card b-spotify">
          <div data-reveal className="b-in">
            <div className="vinyl"><span /></div>
            <h3>Bring your Spotify</h3>
            <p>Play any playlist right inside floe. Log in and your own playlists show up too.</p>
            <div className="mini-chips"><span>Lofi Beats</span><span>Deep Focus</span><span>Peaceful Piano</span></div>
          </div>
        </Tilt>
        <Tilt className="b-card b-sounds">
          <div data-reveal className="b-in">
            <h3>Rain on demand</h3>
            <p>Try it. Every sound is generated live and mixes with the others.</p>
            <SoundsDemo />
          </div>
        </Tilt>
        <Tilt className="b-card b-tasks">
          <div data-reveal className="b-in">
            <h3>One thing at a time</h3>
            <p>Pin a task to the timer. floe counts the sessions it took.</p>
            <TasksDemo />
          </div>
        </Tilt>
        <Tilt className="b-card b-stats" max={4}>
          <div data-reveal className="b-in">
            <div className="b-stats-row">
              <div>
                <h3>Watch the hours stack up</h3>
                <p>A focus calendar, a trend line and your streak. No paywall on your own data.</p>
              </div>
              <div className="stat-pills"><span className="g">Tasks</span><span className="b">Sessions</span><span className="p">Breaks</span></div>
            </div>
            <HeatDemo />
          </div>
        </Tilt>
      </div>
    </section>
  )
}

/* ---------------------------------------------------------- 3D ring */

function SceneRing() {
  const [thumbs, setThumbs] = useState<Record<string, string>>({})
  const [ref, inView] = useInView<HTMLDivElement>('400px')
  useEffect(() => {
    if (!inView || Object.keys(thumbs).length) return
    let i = 0
    const next = () => {
      const t = SCENE_THEMES[i++]
      if (!t) return
      if (t.kind === 'scene') {
        const url = sceneThumb(t.scene, 420, 260)
        setThumbs((m) => ({ ...m, [t.id]: url }))
      }
      window.setTimeout(next, 20)
    }
    next()
  }, [inView, thumbs])
  const n = SCENE_THEMES.length
  return (
    <section className="ring-sec">
      <div className="sec-head center" data-reveal>
        <span className="kicker">03 · The worlds</span>
        <h2>Eight worlds. <em>All of them live.</em></h2>
        <p>Plus drifting gradients, 24/7 lofi streams, or your own photo or video.</p>
      </div>
      <div className="ring-stage" ref={ref}>
        <div className="ring" style={{ ['--n' as string]: n }}>
          {SCENE_THEMES.map((t, i) => (
            <figure key={t.id} style={{ ['--i' as string]: i }}>
              {thumbs[t.id] ? <img src={thumbs[t.id]} alt="" /> : <div className="ph" />}
              <figcaption>{t.name}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}

function Keys() {
  const keys: [string, string][] = [['Space', 'Start / pause'], ['F', 'Fullscreen'], ['1 2 3', 'Switch mode'], ['T', 'Tasks']]
  return (
    <section className="keys-sec">
      <div className="sec-head" data-reveal>
        <span className="kicker">04 · The flow</span>
        <h2>Hands stay on <em>the keyboard.</em></h2>
        <p>Every action has a shortcut, and the interface fades away when you stop moving the mouse.</p>
      </div>
      <div className="keycaps" data-reveal>
        {keys.map(([k, d], i) => (
          <div key={k} className="keycap-wrap" style={{ ['--d' as string]: `${i * 90}ms` }}>
            <kbd className={`keycap ${k === 'Space' ? 'wide' : ''}`}><span>{k}</span></kbd>
            <span className="kc-label">{d}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

const FAQ: [string, string][] = [
  ['Is floe really free?', 'Yes. There’s no paid tier, nothing locked behind a plan, and no account to make. It all runs in your browser.'],
  ['Do I need Spotify Premium?', 'No. The built-in player works for everyone, and you get full tracks if you’re signed in to Spotify in the same browser. Remote-controlling your other devices is a Spotify Premium feature.'],
  ['Where does my data live?', 'In your browser’s local storage, on your machine. You can export a backup any time from Settings → Account, and import it on another computer.'],
  ['Can I use my own background?', 'Yes. Paste an image, a looping video or any YouTube link, or upload a file from your computer. Each mode (Ambient, Home, Focus) can have its own.'],
  ['Does it work offline?', 'The timer, scenes, sounds, tasks and notes all do. Spotify and YouTube streams need a connection.'],
]

function Faq() {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <section className="faq" id="faq">
      <div className="sec-head" data-reveal>
        <span className="kicker">05 · Questions</span>
        <h2>Good questions.</h2>
      </div>
      <div className="faq-list">
        {FAQ.map(([q, a], i) => (
          <div key={q} className={`faq-item ${open === i ? 'open' : ''}`} data-reveal style={{ ['--d' as string]: `${i * 60}ms` }}>
            <button onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>
              <span>{q}</span>
              <Plus size={18} />
            </button>
            <div className="faq-a"><div><p>{a}</p></div></div>
          </div>
        ))}
      </div>
    </section>
  )
}

function Final() {
  return (
    <section className="final">
      <div className="final-inner" data-reveal>
        <h2>Ready when <em>you</em> are.</h2>
        <p>Twenty-five minutes. One thing. Let’s go.</p>
        <a className="cta big" href="/app"><span className="cta-face">Open floe <ArrowRight size={20} /></span></a>
      </div>
      <footer className="l-foot">
        <div className="wordmark" aria-hidden>floe</div>
        <div className="foot-row">
          <span>Made for deep work · {new Date().getFullYear()}</span>
          <span>Everything stays on your device.</span>
        </div>
      </footer>
    </section>
  )
}

export default function Landing() {
  useLandingFx()
  useParallax()
  useEffect(() => { document.title = 'floe · a quiet room for loud minds' }, [])
  return (
    <div className="landing">
      <Nav />
      <Hero />
      <Showcase />
      <Manifesto />
      <Bento />
      <SceneRing />
      <Keys />
      <Faq />
      <Final />
    </div>
  )
}

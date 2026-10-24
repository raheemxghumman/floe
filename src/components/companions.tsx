import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useStore, type AccessoryId, type CompanionId, type CompanionSize, type CompanionSpot } from '../store'
import { useLevel, isUnlocked } from '../lib/levels'
import { useSession } from './clocks'

export type PetState = 'work' | 'rest' | 'idle' | 'pause'
type Art = (p: { state: PetState; level: number }) => ReactNode

interface CompanionDef {
  name: string
  blurb: string
  /** top-of-head point where hats sit, and their scale */
  head: (level: number) => { x: number; y: number; s: number }
  lines: Record<PetState, string[]>
  Art: Art
}

const INK = '#2b2540'

/* --------------------------------------------------------------- tomato */

const Tomato: Art = ({ state }) => (
  <>
    {state === 'rest' && <g className="beanbag"><ellipse cx="80" cy="122" rx="60" ry="22" /><ellipse cx="80" cy="112" rx="44" ry="16" className="bb-top" /></g>}
    <g className="pet-body">
      <ellipse cx="80" cy="82" rx="46" ry="42" fill="#ef4b35" />
      <ellipse cx="80" cy="96" rx="40" ry="26" fill="#d63a26" opacity="0.55" />
      <ellipse cx="62" cy="62" rx="11" ry="7" fill="#fff" opacity="0.35" transform="rotate(-25 62 62)" />
      <path d="M80 44 l-14 -6 l10 10 l-18 2 l18 4 l-8 10 l12 -8 l12 8 l-8 -10 l18 -4 l-18 -2 l10 -10 z" fill="#3fb950" stroke="#2a8a3a" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M80 44 q2 -10 8 -14" fill="none" stroke="#2a8a3a" strokeWidth="3" strokeLinecap="round" />
      <g className={state === 'work' ? 'face-down' : ''}>
        <Eyes state={state} lx={68} rx={92} y={80} />
        <g fill="none" stroke={INK} strokeWidth="1.8"><circle cx="68" cy="80" r="10" /><circle cx="92" cy="80" r="10" /><path d="M78 80 h4" /></g>
        <Cheeks y={94} l={56} r={104} />
        <path d={state === 'work' ? 'M74 98 q6 3 12 0' : 'M72 96 q8 8 16 0'} fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
      </g>
    </g>
    {state === 'work' && <Laptop hand="#ef4b35" handStroke="#c5301e" />}
    {state === 'rest' && <Mug />}
    {(state === 'idle' || state === 'pause') && <circle cx="126" cy="76" r="7" fill="#ef4b35" stroke="#c5301e" className="wave" />}
  </>
)

/* ------------------------------------------------------------------ cat */

const Cat: Art = ({ state }) => {
  const fur = '#c9c3d3', inner = '#f4a3b5'
  const rest = state === 'rest'
  return (
    <>
      {rest
        ? <path d="M118 132 C 140 132, 140 146, 110 146 L 60 146" fill="none" stroke={fur} strokeWidth="10" strokeLinecap="round" />
        : <g className="cat-tail"><path d="M110 126 C 140 128, 148 100, 132 82" fill="none" stroke={fur} strokeWidth="10" strokeLinecap="round" /></g>}
      <g className="pet-body">
        <ellipse cx="80" cy={rest ? 128 : 116} rx={rest ? 46 : 36} ry={rest ? 18 : 28} fill={fur} />
        {!rest && <ellipse cx="80" cy="122" rx="20" ry="18" fill="#ece8f1" />}
        <g transform={rest ? 'translate(-18 26) rotate(-8 80 68)' : undefined}>
          <g className="cat-ear-l"><path d="M54 60 L60 30 L76 52 Z" fill={fur} /><path d="M60 54 L63 38 L71 50 Z" fill={inner} /></g>
          <g className="cat-ear-r"><path d="M106 60 L100 30 L84 52 Z" fill={fur} /><path d="M100 54 L97 38 L89 50 Z" fill={inner} /></g>
          <ellipse cx="80" cy="68" rx="32" ry="27" fill={fur} />
          <Eyes state={state} lx={68} rx={92} y={state === 'work' ? 70 : 67} narrow={state === 'work'} />
          <path d="M77 76 h6 l-3 3.5 z" fill={inner} />
          <path d="M80 79 q-3 4 -6 1 M80 79 q3 4 6 1" fill="none" stroke={INK} strokeWidth="1.6" strokeLinecap="round" />
          <g stroke="#8a8496" strokeWidth="1.2" strokeLinecap="round"><path d="M60 76 L44 72 M60 79 L44 81 M100 76 L116 72 M100 79 L116 81" /></g>
          <Cheeks y={78} l={58} r={102} />
        </g>
      </g>
      {state === 'work' && <Laptop hand={fur} handStroke="#a8a1b4" />}
      {rest && <Zzz x={66} y={84} />}
    </>
  )
}

/* ------------------------------------------------------------------ fox */

const Fox: Art = ({ state }) => {
  const fur = '#f08a3c', cream = '#fff4e8', dark = '#4a2c1f'
  return (
    <>
      <g className="fox-tail">
        <path d="M104 130 C 150 130 152 82 124 70 C 132 96 120 112 100 118 Z" fill={fur} />
        <path d="M124 70 C 133 80 135 91 129 99 C 122 89 118 80 124 70 Z" fill={cream} />
      </g>
      <g className="pet-body">
        <ellipse cx="80" cy="118" rx="32" ry="26" fill={fur} />
        <ellipse cx="80" cy="121" rx="16" ry="18" fill={cream} />
        <ellipse cx="66" cy="142" rx="8" ry="5" fill={dark} /><ellipse cx="94" cy="142" rx="8" ry="5" fill={dark} />
        <path d="M52 64 L56 30 L74 52 Z" fill={fur} /><path d="M56 56 L58 38 L68 50 Z" fill={dark} />
        <path d="M108 64 L104 30 L86 52 Z" fill={fur} /><path d="M104 56 L102 38 L92 50 Z" fill={dark} />
        <path d="M48 62 Q80 40 112 62 Q106 92 80 98 Q54 92 48 62 Z" fill={fur} />
        <path d="M62 80 Q80 70 98 80 Q90 96 80 98 Q70 96 62 80 Z" fill={cream} />
        <Eyes state={state} lx={68} rx={92} y={72} small />
        <ellipse cx="80" cy="88" rx="4" ry="3" fill={INK} />
        <path d="M80 91 q-3 3 -6 1 M80 91 q3 3 6 1" fill="none" stroke={INK} strokeWidth="1.4" strokeLinecap="round" />
      </g>
      {state === 'work' && (
        <g className="book">
          <path d="M50 112 L80 118 L80 140 L50 134 Z" fill="#fff" stroke="#d9cfc4" />
          <path d="M110 112 L80 118 L80 140 L110 134 Z" fill="#fff" stroke="#d9cfc4" />
          <g stroke="#c7bdb1" strokeWidth="1"><path d="M56 120 L74 124 M56 125 L74 129 M86 124 L104 120 M86 129 L104 125" /></g>
          <path d="M80 118 L106 113 L106 134 L80 140 Z" fill="#fbf7f1" stroke="#d9cfc4" className="page-flip" />
          <path d="M44 114 L52 112 L52 136 L44 136 Z" fill="#7c4dff" /><path d="M116 114 L108 112 L108 136 L116 136 Z" fill="#7c4dff" />
        </g>
      )}
      {state === 'rest' && <g className="notes"><text x="108" y="52">♪</text><text x="120" y="40" className="n2">♫</text></g>}
    </>
  )
}

/* ---------------------------------------------------------------- ghost */

const Ghost: Art = ({ state }) => (
  <>
    <g className="pet-body ghost-body">
      <path d="M44 84 Q44 36 80 36 Q116 36 116 84 L116 128 Q108 120 100 128 Q92 136 84 128 Q76 120 68 128 Q60 136 52 128 Q48 124 44 128 Z" fill="#f4f2ff" />
      <path d="M52 60 Q60 44 76 42" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity="0.8" />
      <Eyes state={state} lx={68} rx={92} y={76} tall />
      <ellipse cx="80" cy="94" rx={state === 'idle' ? 4 : 3} ry={state === 'idle' ? 5 : 2.5} fill={INK} />
      <Cheeks y={88} l={58} r={102} />
      <circle cx="42" cy="98" r="8" fill="#f4f2ff" />
      <circle cx="118" cy="98" r="8" fill="#f4f2ff" className={state === 'idle' ? 'wave-ghost' : ''} />
    </g>
    {state === 'work' && (
      <g className="scribble">
        <rect x="56" y="112" width="48" height="28" rx="3" fill="#fff" stroke="#d6d2ea" />
        <path d="M62 120 h30 M62 126 h36 M62 132 h22" stroke="#b9b3d6" strokeWidth="1.4" />
        <g className="pencil"><rect x="96" y="100" width="6" height="30" rx="2" fill="#fbbf24" transform="rotate(30 99 115)" /><path d="M91 126 l4 8 l4 -6 z" fill={INK} /></g>
      </g>
    )}
    {state === 'rest' && <Zzz x={104} y={44} />}
  </>
)

/* ---------------------------------------------------------------- robot */

const Robot: Art = ({ state }) => (
  <>
    <g className="pet-body">
      <line x1="80" y1="30" x2="80" y2="16" stroke="#8a97ab" strokeWidth="3" />
      <circle cx="80" cy="13" r="5" className="bulb" />
      <rect x="46" y="30" width="68" height="52" rx="14" fill="#cdd6e4" stroke="#8a97ab" strokeWidth="2" />
      <rect x="54" y="38" width="52" height="34" rx="8" fill="#1d2433" />
      {state === 'work' && <g className="rb-focus"><rect x="62" y="52" width="12" height="4" rx="2" /><rect x="86" y="52" width="12" height="4" rx="2" /><rect x="56" y="62" width="48" height="1.5" className="scanline" /></g>}
      {(state === 'idle' || state === 'pause') && <g className="rb-eyes"><rect x="63" y="47" width="10" height="14" rx="4" /><rect x="87" y="47" width="10" height="14" rx="4" /></g>}
      {state === 'rest' && (
        <g className="battery">
          <rect x="64" y="46" width="30" height="16" rx="3" fill="none" stroke="#7cf7c9" strokeWidth="2" />
          <rect x="94" y="51" width="3" height="6" rx="1" fill="#7cf7c9" />
          <rect x="67" y="49" width="6" height="10" className="bat-1" /><rect x="75" y="49" width="6" height="10" className="bat-2" /><rect x="83" y="49" width="6" height="10" className="bat-3" />
        </g>
      )}
      <rect x="54" y="86" width="52" height="40" rx="10" fill="#b7c2d3" stroke="#8a97ab" strokeWidth="2" />
      <g className={state === 'work' ? 'gear spin' : 'gear'} style={{ transformOrigin: '80px 106px' }}>
        <circle cx="80" cy="106" r="9" fill="#7432ff" />
        {Array.from({ length: 8 }, (_, i) => <rect key={i} x="78" y="94" width="4" height="5" rx="1" fill="#7432ff" transform={`rotate(${i * 45} 80 106)`} />)}
        <circle cx="80" cy="106" r="3.5" fill="#cdd6e4" />
      </g>
      <rect x="40" y="90" width="12" height="26" rx="6" fill="#cdd6e4" className={state === 'work' ? 'arm-l type' : 'arm-l'} />
      <rect x="108" y="90" width="12" height="26" rx="6" fill="#cdd6e4" className={state === 'work' ? 'arm-r type' : (state === 'idle' ? 'arm-r wave-arm' : 'arm-r')} />
      <rect x="58" y="128" width="16" height="12" rx="4" fill="#8a97ab" /><rect x="86" y="128" width="16" height="12" rx="4" fill="#8a97ab" />
    </g>
    {state === 'work' && <rect x="42" y="132" width="76" height="8" rx="3" fill="#3a3d4a" />}
    {state === 'rest' && <Zzz x={108} y={30} />}
  </>
)

/* --------------------------------------------------------------- sprout */

const sproutStage = (level: number) => (level < 3 ? 1 : level < 6 ? 2 : 3)

const Sprout: Art = ({ state, level }) => {
  const stage = sproutStage(level)
  const top = stage === 1 ? 84 : stage === 2 ? 62 : 52
  const leaf = (x: number, y: number, r: number, k: string) => <ellipse key={k} cx={x} cy={y} rx="12" ry="6" fill="#5fbf6a" transform={`rotate(${r} ${x} ${y})`} />
  return (
    <>
      <g className="pet-body">
        <g className="plant">
          <path d={`M80 104 Q76 ${(104 + top) / 2} 80 ${top}`} fill="none" stroke="#3f9a4b" strokeWidth="4" strokeLinecap="round" />
          {stage >= 1 && [leaf(70, top + 6, -30, 'a'), leaf(90, top + 2, 30, 'b')]}
          {stage >= 2 && [leaf(68, 92, -20, 'c'), leaf(92, 86, 20, 'd')]}
          {stage === 3 && (
            <g className="bloom">
              {Array.from({ length: 6 }, (_, i) => <ellipse key={i} cx="80" cy={top - 12} rx="6" ry="11" fill={i % 2 ? '#ff9ec2' : '#ffc0d6'} transform={`rotate(${i * 60} 80 ${top})`} />)}
              <circle cx="80" cy={top} r="6" fill="#fbbf24" />
            </g>
          )}
        </g>
        <rect x="50" y="102" width="60" height="12" rx="4" fill="#ec8c62" />
        <path d="M54 112 L106 112 L100 146 L60 146 Z" fill="#e07a52" />
        <ellipse cx="80" cy="104" rx="26" ry="4" fill="#6b4a33" />
        <Eyes state={state} lx={70} rx={90} y={126} small />
        <path d={state === 'rest' ? 'M76 133 q4 2 8 0' : 'M75 132 q5 5 10 0'} fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" />
        <Cheeks y={131} l={64} r={96} />
      </g>
      {state === 'work' && <g className="sparkles">{[0, 1, 2, 3].map((i) => <circle key={i} cx={64 + i * 11} cy={top + 10} r="2.2" style={{ animationDelay: `${i * 0.5}s` }} />)}</g>}
      {state === 'rest' && (
        <g className="watering">
          <path d="M112 40 h22 v16 h-22 z" fill="#60a5fa" /><path d="M112 44 l-16 8 l2 4 l16 -6 z" fill="#3b82f6" />
          {[0, 1, 2].map((i) => <ellipse key={i} cx={92 - i * 4} cy="62" rx="1.6" ry="3" fill="#93c5fd" className="drop" style={{ animationDelay: `${i * 0.35}s` }} />)}
        </g>
      )}
    </>
  )
}

/* -------------------------------------------------------------- shared */

function Eyes({ state, lx, rx, y, narrow, small, tall }: { state: PetState; lx: number; rx: number; y: number; narrow?: boolean; small?: boolean; tall?: boolean }) {
  if (state === 'rest') {
    return <g fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round"><path d={`M${lx - 6} ${y} q6 5 12 0`} /><path d={`M${rx - 6} ${y} q6 5 12 0`} /></g>
  }
  const w = small ? 3.6 : 4.6, h = narrow ? 3 : tall ? 7 : small ? 4.2 : 6
  return (
    <g className="blink" style={{ transformOrigin: `${(lx + rx) / 2}px ${y}px` }}>
      <ellipse cx={lx} cy={y} rx={w} ry={h} fill={INK} /><ellipse cx={rx} cy={y} rx={w} ry={h} fill={INK} />
      {!narrow && <><circle cx={lx + 1.5} cy={y - 2} r="1.5" fill="#fff" /><circle cx={rx + 1.5} cy={y - 2} r="1.5" fill="#fff" /></>}
    </g>
  )
}
const Cheeks = ({ y, l, r }: { y: number; l: number; r: number }) => (
  <g fill="#ff8fa0" opacity="0.7"><ellipse cx={l} cy={y} rx="6" ry="3.4" /><ellipse cx={r} cy={y} rx="6" ry="3.4" /></g>
)
const Laptop = ({ hand, handStroke }: { hand: string; handStroke: string }) => (
  <g>
    <path d="M44 118 h72 l8 12 h-88 z" fill="#c9ccd6" stroke="#8a8ea0" />
    <path d="M52 86 h56 v32 h-56 z" fill="#3a3d4a" stroke="#8a8ea0" strokeWidth="1.4" />
    <circle cx="80" cy="102" r="3" fill="#fff" opacity="0.6" className="glow-pulse" />
    <circle cx="62" cy="122" r="6" fill={hand} stroke={handStroke} className="type" />
    <circle cx="98" cy="122" r="6" fill={hand} stroke={handStroke} className="type t2" />
  </g>
)
const Mug = () => (
  <g>
    <path d="M96 100 h20 v18 a6 6 0 0 1 -6 6 h-8 a6 6 0 0 1 -6 -6 z" fill="#f5f0e6" stroke="#8a7a66" strokeWidth="1.4" />
    <path d="M116 104 q8 0 8 6 q0 6 -8 6" fill="none" stroke="#8a7a66" strokeWidth="2.4" />
    <path d="M102 94 q-4 -6 0 -12 q4 -6 0 -12" className="steam" /><path d="M110 94 q-4 -6 0 -12 q4 -6 0 -12" className="steam s2" />
  </g>
)
const Zzz = ({ x, y }: { x: number; y: number }) => (
  <g className="zzz"><text x={x} y={y}>z</text><text x={x + 9} y={y - 10} className="z2">z</text><text x={x + 18} y={y - 22} className="z3">Z</text></g>
)

/* --------------------------------------------------------- accessories */

export const ACCESSORIES: Record<AccessoryId, { label: string; Art: () => ReactNode }> = {
  none: { label: 'None', Art: () => null },
  headphones: {
    label: 'Headphones',
    Art: () => (<g><path d="M-30 12 Q0 -28 30 12" fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" /><rect x="-38" y="6" width="13" height="22" rx="6" fill="#7432ff" /><rect x="25" y="6" width="13" height="22" rx="6" fill="#7432ff" /></g>),
  },
  party: {
    label: 'Party hat',
    Art: () => (<g transform="rotate(-10)"><path d="M-15 4 L0 -38 L15 4 Z" fill="#ff7a59" /><path d="M-10 -10 L8 -6 M-6 -22 L5 -19" stroke="#ffd166" strokeWidth="3" strokeLinecap="round" /><circle cx="0" cy="-40" r="5" fill="#fff" /></g>),
  },
  flowers: {
    label: 'Flower crown',
    Art: () => (<g>{[-26, -13, 0, 13, 26].map((x, i) => <g key={x} transform={`translate(${x} ${Math.abs(x) * 0.22})`}><circle r="5.5" fill={['#ff9ec2', '#fbbf24', '#c4b5fd', '#fbbf24', '#ff9ec2'][i]} /><circle r="2" fill="#fff7d1" /></g>)}</g>),
  },
  wizard: {
    label: 'Wizard hat',
    Art: () => (<g transform="rotate(-6)"><ellipse cx="0" cy="4" rx="28" ry="6" fill="#4c2a85" /><path d="M-17 4 Q-4 -30 9 -46 Q6 -20 17 4 Z" fill="#5b34a3" /><path d="M-4 -14 l2 4 l4 1 l-4 2 l-1 4 l-2 -4 l-4 -1 l4 -2 z M6 -28 l1 2 l2 .5 l-2 1 l-.5 2 l-1 -2 l-2 -.5 l2 -1 z" fill="#fde68a" /></g>),
  },
  crown: {
    label: 'Golden crown',
    Art: () => (<g><path d="M-18 6 L-18 -12 L-9 -2 L0 -20 L9 -2 L18 -12 L18 6 Z" fill="#fbbf24" stroke="#d89b0b" strokeWidth="1.5" strokeLinejoin="round" /><circle cx="0" cy="0" r="3" fill="#ef4444" /><circle cx="-10" cy="2" r="2" fill="#3b82f6" /><circle cx="10" cy="2" r="2" fill="#22c55e" /></g>),
  },
}

/* --------------------------------------------------------------- catalog */

export const COMPANIONS: Record<CompanionId, CompanionDef> = {
  tomato: {
    name: 'Tomato', blurb: 'The original. Types fast, naps faster.', Art: Tomato,
    head: () => ({ x: 80, y: 36, s: 1 }),
    lines: { work: ['Deep breaths. One thing.', 'You’re doing great!', 'Typing… typing…'], rest: ['Tea time ☕', 'Stretch those shoulders!', 'Hydrate!'], idle: ['Ready when you are!', 'Let’s go?'], pause: ['Take your time.'] },
  },
  sprout: {
    name: 'Sprout', blurb: 'Grows a little every time you level up.', Art: Sprout,
    head: (level) => ({ x: 80, y: [0, 74, 52, 30][sproutStage(level)], s: 0.85 }),
    lines: { work: ['Growing with you 🌱', 'Sun’s out, focus out.'], rest: ['Watering break!', 'Ahh, refreshing.'], idle: ['Plant a session?'], pause: ['Resting my leaves.'] },
  },
  cat: {
    name: 'Mochi', blurb: 'A sleepy cat with surprisingly fast paws.', Art: Cat,
    head: () => ({ x: 80, y: 36, s: 1 }),
    lines: { work: ['Purr-ductive.', 'Paws on keys.'], rest: ['Nap o’clock.', 'Wake me at the bell.'], idle: ['Mrrp?'], pause: ['Five more minutes…'] },
  },
  fox: {
    name: 'Kit', blurb: 'Reads while you work. Hums on breaks.', Art: Fox,
    head: () => ({ x: 80, y: 40, s: 1 }),
    lines: { work: ['Page by page.', 'Clever and focused.'], rest: ['La la la ♪', 'Tail wags only.'], idle: ['Hop to it!'], pause: ['Bookmarking this.'] },
  },
  ghost: {
    name: 'Boo', blurb: 'Haunts your to-do list in the best way.', Art: Ghost,
    head: () => ({ x: 80, y: 38, s: 1 }),
    lines: { work: ['Spooky productive.', 'Scribble scribble.'], rest: ['Floating off…', 'Boo-tiful break.'], idle: ['👋 Boo!'], pause: ['I’ll wait. Forever.'] },
  },
  robot: {
    name: 'Bit', blurb: 'Runs on focus. Recharges on breaks.', Art: Robot,
    head: () => ({ x: 80, y: 24, s: 0.95 }),
    lines: { work: ['Processing…', 'Efficiency at 100%.'], rest: ['Recharging 🔋', 'Low power mode.'], idle: ['Awaiting input.'], pause: ['Standby.'] },
  },
}
export const COMPANION_IDS = Object.keys(COMPANIONS) as CompanionId[]

/* ----------------------------------------------------------- rendering */

/** Pure SVG of a companion, used both in the app and in settings previews. */
export function CompanionArt({ id, state, level, accessory = 'none', effect = 'none' }: {
  id: CompanionId; state: PetState; level: number; accessory?: AccessoryId; effect?: 'none' | 'sparkles' | 'golden'
}) {
  const def = COMPANIONS[id]
  const h = def.head(level)
  const Acc = ACCESSORIES[accessory].Art
  return (
    <svg viewBox="0 -30 160 180" className={`pet-svg pet-${id} st-${state} fx-${effect}`} aria-hidden>
      <ellipse cx="80" cy="146" rx="44" ry="6" fill="rgba(0,0,0,0.22)" className="pet-shadow" />
      {effect !== 'none' && (
        <g className="aura">
          {[[22, 40], [138, 30], [30, 110], [136, 104], [80, -14], [60, 4]].map(([x, y], i) => (
            <path key={i} d="M0 -6 L1.6 -1.6 L6 0 L1.6 1.6 L0 6 L-1.6 1.6 L-6 0 L-1.6 -1.6 Z" transform={`translate(${x} ${y})`} style={{ animationDelay: `${i * 0.4}s` }} />
          ))}
        </g>
      )}
      <def.Art state={state} level={level} />
      {accessory !== 'none' && <g className="pet-acc" transform={`translate(${h.x} ${h.y}) scale(${h.s})`}><Acc /></g>}
    </svg>
  )
}

function useChatter(id: CompanionId, state: PetState, enabled: boolean) {
  const [line, setLine] = useState<string | null>(null)
  const prev = useRef<PetState | null>(null)
  useEffect(() => {
    if (!enabled) { setLine(null); return }
    const say = () => {
      const pool = COMPANIONS[id].lines[state]
      setLine(pool[Math.floor(Math.random() * pool.length)])
      window.setTimeout(() => setLine(null), 4200)
    }
    if (prev.current !== null && prev.current !== state) say()
    prev.current = state
    const t = window.setInterval(() => { if (Math.random() < 0.5) say() }, 75_000)
    return () => clearInterval(t)
  }, [id, state, enabled])
  return line
}

/** A companion placed on a page; its pose follows the timer. */
export function Companion({ id, spot, size }: { id: CompanionId | 'none'; spot: CompanionSpot; size: CompanionSize }) {
  const { timer, active } = useSession()
  const pet = useStore((s) => s.settings.pet)
  const { level } = useLevel()
  const safeId: CompanionId = id !== 'none' && isUnlocked('companion', id, level) ? id : 'tomato'
  const state: PetState = timer.running ? (timer.mode === 'focus' ? 'work' : 'rest') : active ? 'pause' : 'idle'
  const accessory = isUnlocked('accessory', pet.accessory, level) ? pet.accessory : 'none'
  const effect = pet.effect !== 'none' && isUnlocked('effect', pet.effect, level) ? pet.effect : 'none'
  const line = useChatter(safeId, state, pet.chatter && id !== 'none')
  if (id === 'none') return null
  return (
    <div className={`pet spot-${spot} size-${size} motion-${pet.motion}`} title={`${COMPANIONS[safeId].name} · level ${level}`}>
      {line && <div className="pet-bubble" key={line}>{line}</div>}
      <CompanionArt id={safeId} state={state} level={level} accessory={accessory} effect={effect} />
    </div>
  )
}

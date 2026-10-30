import type { SceneId } from './scenes'
import type { CustomTheme } from './store'
import type { Fx } from './scenes/overlays'
import type { ShaderLook } from './shaders/renderer'
import { ABSTRACT_SHADERS, ANIMATED_SHADERS, GRADIENT_SHADERS, type ShaderTheme } from './themelib/shaders'
import { PHOTO_THEMES } from './themelib/photos'

export type Category = 'gradients' | 'abstract' | 'scenic' | 'nature' | 'urban' | 'interior' | 'animated'
export const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'gradients', label: 'Gradients & Colors' }, { id: 'abstract', label: 'Abstract' }, { id: 'scenic', label: 'Scenic' },
  { id: 'nature', label: 'Nature' }, { id: 'urban', label: 'Urban' }, { id: 'interior', label: 'Interior' }, { id: 'animated', label: 'Animated' },
]

export interface Credit { title: string; author: string; license: string; url: string }

type Base = { id: string; name: string; tone?: 'light'; cats?: Category[] }
export type ThemeDef = Base & (
  | { kind: 'gradient'; base: string; blobs: [string, string, string, string] }
  | { kind: 'flat'; base: string; blobs: [string, string, string] }
  | { kind: 'scene'; scene: SceneId; blurb: string }
  | { kind: 'shader'; look: ShaderLook }
  | { kind: 'photo'; src: string; thumb: string; fx: Fx[]; focus?: string; credit?: Credit }
  | { kind: 'youtube'; videoId: string; blurb: string }
  | { kind: 'image' | 'video'; src: string; local?: boolean }
)

export const SCENE_THEMES: ThemeDef[] = [
  { id: 'forest', name: 'Enchanted Forest', kind: 'scene', scene: 'forest', blurb: 'Fireflies & light rays', cats: ['animated', 'nature'] },
  { id: 'rain', name: 'Rainy City', kind: 'scene', scene: 'rain', blurb: 'Rain on the window', cats: ['animated', 'urban'] },
  { id: 'stars', name: 'Starry Night', kind: 'scene', scene: 'stars', blurb: 'Shooting stars', cats: ['animated'] },
  { id: 'aurora', name: 'Aurora', kind: 'scene', scene: 'aurora', blurb: 'Northern lights', cats: ['animated', 'nature'] },
  { id: 'snow', name: 'Winter Cabin Night', kind: 'scene', scene: 'snow', blurb: 'Snowfall & warm light', cats: ['animated'] },
  { id: 'synthwave', name: 'Synthwave', kind: 'scene', scene: 'synthwave', blurb: 'Retro sunset drive', cats: ['animated'] },
  { id: 'ocean', name: 'Ocean Sunset', kind: 'scene', scene: 'ocean', blurb: 'Waves & glitter', cats: ['animated'] },
  { id: 'sakura', name: 'Sakura Drift', kind: 'scene', scene: 'sakura', blurb: 'Falling petals', cats: ['animated'] },
  { id: 'pixel', name: 'Pixel Valley', kind: 'scene', scene: 'pixel', blurb: 'Retro sunset, 8-bit clouds', cats: ['animated'] },
  { id: 'park', name: 'Pastel Park', kind: 'scene', scene: 'park', blurb: 'Soft hills & swaying trees', tone: 'light', cats: ['animated'] },
  { id: 'cozy', name: 'Cozy Cat', kind: 'scene', scene: 'cozy', blurb: 'A nap in the sun', tone: 'light', cats: ['animated', 'interior'] },
]

export const FLAT_THEMES: ThemeDef[] = [
  { id: 'tomato', name: 'Tomato', kind: 'flat', base: '#c2410c', blobs: ['#ea580c', '#f97316', '#9a3412'], cats: ['gradients'] },
  { id: 'periwinkle', name: 'Periwinkle', kind: 'flat', base: '#c3c9f5', blobs: ['#d9ddff', '#aeb6f0', '#e8eaff'], tone: 'light', cats: ['gradients'] },
  { id: 'cream', name: 'Cream', kind: 'flat', base: '#f4ece0', blobs: ['#fbe3cc', '#e9dccb', '#e3ecdf'], tone: 'light', cats: ['gradients'] },
  { id: 'blush', name: 'Blush', kind: 'flat', base: '#f6d3cd', blobs: ['#fbe4df', '#eebcb4', '#f9dcc4'], tone: 'light', cats: ['gradients'] },
  { id: 'sage', name: 'Sage', kind: 'flat', base: '#2f4a3c', blobs: ['#3d6150', '#557a66', '#253b30'], cats: ['gradients'] },
  { id: 'ink', name: 'Ink', kind: 'flat', base: '#14131c', blobs: ['#1f1d2b', '#272438', '#0d0c14'], cats: ['gradients'] },
]

export const GRADIENT_THEMES: ThemeDef[] = [
  { id: 'twilight', name: 'Twilight', kind: 'gradient', base: '#130a24', blobs: ['#6a1be8', '#f2674a', '#ffc19a', '#3a0d8c'], cats: ['gradients'] },
  { id: 'lagoon', name: 'Lagoon', kind: 'gradient', base: '#04131c', blobs: ['#0b7a8a', '#1d4ed8', '#5eead4', '#0f2a5c'], cats: ['gradients'] },
  { id: 'ember', name: 'Ember Glow', kind: 'gradient', base: '#170705', blobs: ['#e2482d', '#f59e0b', '#7c1d3a', '#3b0a1a'], cats: ['gradients'] },
  { id: 'matcha', name: 'Matcha', kind: 'gradient', base: '#04120d', blobs: ['#10b981', '#0e7490', '#a3e635', '#064e3b'], cats: ['gradients'] },
  { id: 'peony', name: 'Peony', kind: 'gradient', base: '#180510', blobs: ['#db2777', '#f472b6', '#7c3aed', '#fda4af'], cats: ['gradients'] },
  { id: 'midnight', name: 'Midnight', kind: 'gradient', base: '#05060f', blobs: ['#1e3a8a', '#4c1d95', '#0f766e', '#312e81'], cats: ['gradients'] },
]

export const STREAM_THEMES: ThemeDef[] = [
  { id: 'yt-lofi', name: 'Lofi Girl', kind: 'youtube', videoId: 'jfKfPfyJRdk', blurb: 'beats to relax/study to', cats: ['animated'] },
  { id: 'yt-synth', name: 'Synthwave Boy', kind: 'youtube', videoId: '4xDzrJKXOOY', blurb: 'beats to chill/game to', cats: ['animated'] },
  { id: 'yt-sleep', name: 'Sleepy Lofi', kind: 'youtube', videoId: 'rUxyKA_-grg', blurb: 'beats to sleep/chill to', cats: ['animated'] },
]

const fromShader = (cats: Category[]) => (t: ShaderTheme): ThemeDef => ({ id: t.id, name: t.name, kind: 'shader', look: t, tone: t.light ? 'light' : undefined, cats })

export const SHADER_THEMES: ThemeDef[] = [
  ...GRADIENT_SHADERS.map(fromShader(['gradients'])),
  ...ABSTRACT_SHADERS.map(fromShader(['abstract'])),
  ...ANIMATED_SHADERS.map(fromShader(['animated'])),
]

/** Every built-in theme, in the order the library shows them. */
export const LIBRARY: ThemeDef[] = [...SHADER_THEMES, ...GRADIENT_THEMES, ...FLAT_THEMES, ...PHOTO_THEMES, ...SCENE_THEMES, ...STREAM_THEMES]
const BY_ID = new Map(LIBRARY.map((t) => [t.id, t]))

export const inCategory = (cat: Category) => LIBRARY.filter((t) => t.cats?.includes(cat))

export function resolveTheme(id: string, custom: CustomTheme[]): ThemeDef {
  const found = BY_ID.get(id)
  if (found) return found
  const c = custom.find((t) => t.id === id)
  if (c) {
    if (c.kind === 'youtube') return { id: c.id, name: c.name, kind: 'youtube', videoId: c.src, blurb: 'Custom stream' }
    return { id: c.id, name: c.name, kind: c.kind, src: c.src, local: c.local }
  }
  return BY_ID.get('thermal') ?? LIBRARY[0]
}

export function gradientCss(t: Extract<ThemeDef, { kind: 'gradient' }>) {
  const [a, b, c, d] = t.blobs
  return `radial-gradient(circle at 15% 40%, ${a} 0%, transparent 55%), radial-gradient(circle at 85% 80%, ${b} 0%, transparent 55%), radial-gradient(circle at 95% 100%, ${c} 0%, transparent 45%), radial-gradient(circle at 50% 10%, ${d} 0%, transparent 60%), ${t.base}`
}

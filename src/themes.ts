import type { SceneId } from './scenes'
import type { CustomTheme } from './store'

type Tone = { tone?: 'light' }
export type ThemeDef = Tone & (
  | { id: string; name: string; kind: 'gradient'; base: string; blobs: [string, string, string, string] }
  | { id: string; name: string; kind: 'flat'; base: string; blobs: [string, string, string] }
  | { id: string; name: string; kind: 'scene'; scene: SceneId; blurb: string }
  | { id: string; name: string; kind: 'youtube'; videoId: string; blurb: string }
  | { id: string; name: string; kind: 'image' | 'video'; src: string; local?: boolean }
)

export const SCENE_THEMES: ThemeDef[] = [
  { id: 'forest', name: 'Enchanted Forest', kind: 'scene', scene: 'forest', blurb: 'Fireflies & light rays' },
  { id: 'rain', name: 'Rainy City', kind: 'scene', scene: 'rain', blurb: 'Rain on the window' },
  { id: 'stars', name: 'Starry Night', kind: 'scene', scene: 'stars', blurb: 'Shooting stars' },
  { id: 'aurora', name: 'Aurora', kind: 'scene', scene: 'aurora', blurb: 'Northern lights' },
  { id: 'snow', name: 'Winter Cabin', kind: 'scene', scene: 'snow', blurb: 'Snowfall & warm light' },
  { id: 'synthwave', name: 'Synthwave', kind: 'scene', scene: 'synthwave', blurb: 'Retro sunset drive' },
  { id: 'ocean', name: 'Ocean Sunset', kind: 'scene', scene: 'ocean', blurb: 'Waves & glitter' },
  { id: 'sakura', name: 'Sakura', kind: 'scene', scene: 'sakura', blurb: 'Falling petals' },
  { id: 'pixel', name: 'Pixel Valley', kind: 'scene', scene: 'pixel', blurb: 'Retro sunset, 8-bit clouds' },
  { id: 'park', name: 'Pastel Park', kind: 'scene', scene: 'park', blurb: 'Soft hills & swaying trees', tone: 'light' },
  { id: 'cozy', name: 'Cozy Cat', kind: 'scene', scene: 'cozy', blurb: 'A nap in the sun', tone: 'light' },
]

export const FLAT_THEMES: ThemeDef[] = [
  { id: 'tomato', name: 'Tomato', kind: 'flat', base: '#c2410c', blobs: ['#ea580c', '#f97316', '#9a3412'] },
  { id: 'periwinkle', name: 'Periwinkle', kind: 'flat', base: '#c3c9f5', blobs: ['#d9ddff', '#aeb6f0', '#e8eaff'], tone: 'light' },
  { id: 'cream', name: 'Cream', kind: 'flat', base: '#f4ece0', blobs: ['#fbe3cc', '#e9dccb', '#e3ecdf'], tone: 'light' },
  { id: 'blush', name: 'Blush', kind: 'flat', base: '#f6d3cd', blobs: ['#fbe4df', '#eebcb4', '#f9dcc4'], tone: 'light' },
  { id: 'sage', name: 'Sage', kind: 'flat', base: '#2f4a3c', blobs: ['#3d6150', '#557a66', '#253b30'] },
  { id: 'ink', name: 'Ink', kind: 'flat', base: '#14131c', blobs: ['#1f1d2b', '#272438', '#0d0c14'] },
]

export const GRADIENT_THEMES: ThemeDef[] = [
  { id: 'twilight', name: 'Twilight', kind: 'gradient', base: '#130a24', blobs: ['#6a1be8', '#f2674a', '#ffc19a', '#3a0d8c'] },
  { id: 'lagoon', name: 'Lagoon', kind: 'gradient', base: '#04131c', blobs: ['#0b7a8a', '#1d4ed8', '#5eead4', '#0f2a5c'] },
  { id: 'ember', name: 'Ember', kind: 'gradient', base: '#170705', blobs: ['#e2482d', '#f59e0b', '#7c1d3a', '#3b0a1a'] },
  { id: 'matcha', name: 'Matcha', kind: 'gradient', base: '#04120d', blobs: ['#10b981', '#0e7490', '#a3e635', '#064e3b'] },
  { id: 'peony', name: 'Peony', kind: 'gradient', base: '#180510', blobs: ['#db2777', '#f472b6', '#7c3aed', '#fda4af'] },
  { id: 'midnight', name: 'Midnight', kind: 'gradient', base: '#05060f', blobs: ['#1e3a8a', '#4c1d95', '#0f766e', '#312e81'] },
]

export const STREAM_THEMES: ThemeDef[] = [
  { id: 'yt-lofi', name: 'Lofi Girl', kind: 'youtube', videoId: 'jfKfPfyJRdk', blurb: 'beats to relax/study to' },
  { id: 'yt-synth', name: 'Synthwave Boy', kind: 'youtube', videoId: '4xDzrJKXOOY', blurb: 'beats to chill/game to' },
  { id: 'yt-sleep', name: 'Sleepy Lofi', kind: 'youtube', videoId: 'rUxyKA_-grg', blurb: 'beats to sleep/chill to' },
]

const ALL = [...SCENE_THEMES, ...GRADIENT_THEMES, ...FLAT_THEMES, ...STREAM_THEMES]

export function resolveTheme(id: string, custom: CustomTheme[]): ThemeDef {
  const found = ALL.find((t) => t.id === id)
  if (found) return found
  const c = custom.find((t) => t.id === id)
  if (c) {
    if (c.kind === 'youtube') return { id: c.id, name: c.name, kind: 'youtube', videoId: c.src, blurb: 'Custom stream' }
    return { id: c.id, name: c.name, kind: c.kind, src: c.src, local: c.local }
  }
  return GRADIENT_THEMES[0]
}

export function gradientCss(t: Extract<ThemeDef, { kind: 'gradient' }>) {
  const [a, b, c, d] = t.blobs
  return `radial-gradient(circle at 15% 40%, ${a} 0%, transparent 55%), radial-gradient(circle at 85% 80%, ${b} 0%, transparent 55%), radial-gradient(circle at 95% 100%, ${c} 0%, transparent 45%), radial-gradient(circle at 50% 10%, ${d} 0%, transparent 60%), ${t.base}`
}

import type { ShaderLook } from '../shaders/renderer'

export interface ShaderTheme extends ShaderLook { id: string; name: string; light?: boolean }

// params: [shape, grain, speed, variant]
// mesh color order = anchors: top-left, left, bottom-right, far bottom-right, top, center
const M = (id: string, name: string, colors: string[], o: { power?: number; grain?: number; speed?: number; drift?: number; light?: boolean } = {}): ShaderTheme =>
  ({ id, name, program: 'mesh', colors, params: [o.power ?? 2.4, o.grain ?? 0.05, o.speed ?? 0.35, o.drift ?? 0.14], light: o.light })
const H = (id: string, name: string, colors: string[], light = false): ShaderTheme =>
  ({ id, name, program: 'heart', colors, params: [3.2, 0.045, 1, 0], light })
const F = (id: string, name: string, colors: string[], o: { rainbow?: boolean; light?: boolean; spread?: number } = {}): ShaderTheme =>
  ({ id, name, program: 'flare', colors, params: [o.spread ?? 2.2, 0.05, 0.5, o.rainbow ? 1 : 0], light: o.light })

export const GRADIENT_SHADERS: ShaderTheme[] = [
  M('thermal', 'Thermal', ['#3a0d8c', '#7a1ff0', '#f2674a', '#ffc7a0', '#120a24', '#2a0b4e'], { power: 2.0 }),
  M('cotton', 'Cotton', ['#f4f6ff', '#9fc3ff', '#ffc6e6', '#ffffff', '#c9b8ff', '#bfe0ff'], { light: true, grain: 0.03 }),
  M('autumn', 'Autumn', ['#f1e0c5', '#c0532f', '#6e2410', '#e8b26a', '#a7bb9f', '#f7e9d6'], { light: true }),
  M('horizon', 'Horizon', ['#0b1a4a', '#ff7a59', '#ffd0a0', '#3b1f6e', '#1f4fd1', '#060a20']),
  M('popsicle', 'Popsicle', ['#ff6ab0', '#4fd1ff', '#ffffff', '#ffd166', '#7b61ff', '#c8f0ff'], { light: true }),
  M('dusk', 'Dusk', ['#1a0f3a', '#e8553e', '#ff9a62', '#3a1868', '#c2185b', '#0d0820']),
  F('deep-sea', 'Deep Sea', ['#02040f', '#1e6bff', '#0bd3ff'], { spread: 1.6 }),
  M('ember-light', 'Ember', ['#faf6f2', '#1a1410', '#ff7a3c', '#ffffff', '#ece5dc', '#ffb38a'], { light: true, power: 2.8 }),
  { id: 'ribbon', name: 'Ribbon', program: 'ribbon', colors: ['#06070f', '#ff6a3d', '#7c3aed', '#e8e8f0'], params: [0, 0.05, 0.6, 0] },
  M('dune', 'Dune', ['#ff8a00', '#2b3cff', '#ff5a1f', '#1a0f5a', '#ffb000', '#0a0f3a'], { power: 2.8 }),
  M('aura-twilight', 'Aura Twilight', ['#6a4bff', '#ff8adf', '#b8a6ff', '#5a36e6', '#ffb3d9', '#8b6bff'], { power: 2.0 }),
  H('peach-heart', 'Peach Aura Heart', ['#ff9a7a', '#ff6aa8', '#ffe0d0', '#fff7f2']),
  H('pink-heart', 'Light Pink Heart', ['#ffe4f0', '#ffc8e0', '#ff4fa0', '#ff9ccc'], true),
  F('flare', 'Flare', ['#0a0712', '#ff4fa0', '#ff8a4f'], { spread: 1.5 }),
  { id: 'minimal-black', name: 'Minimalist Black', program: 'solid', colors: ['#050505', '#000000'], params: [0, 0.02, 0, 0] },
  { id: 'minimal-white', name: 'Minimalist White', program: 'solid', colors: ['#ffffff', '#eceef2'], params: [0, 0.015, 0, 0], light: true },
  F('blue-flare', 'Blue Flare', ['#03081a', '#3b6bff', '#8fd0ff'], { spread: 1.5 }),
  F('pink-flare', 'Pink Flare', ['#fff2f8', '#ff6ad5', '#ffb38a'], { light: true, spread: 1.6 }),
  F('rainbow-flare', 'Rainbow Flare', ['#05050c', '#ffffff', '#ffffff'], { rainbow: true, spread: 1.4 }),
  F('dark-flare', 'Dark Flare', ['#050508', '#5a2aae', '#ff3d81'], { spread: 1.7 }),
  M('heat-map', 'Heat Map', ['#ff0040', '#ffb000', '#7a00ff', '#0040ff', '#ff6a00', '#3a00a0'], { power: 3.0 }),
  H('dark-purple-heart', 'Dark Purple Heart', ['#0b0418', '#22093e', '#a34bff', '#f0c8ff']),
  H('light-purple-heart', 'Light Purple Heart', ['#f3ecff', '#e3d4ff', '#a44bff', '#e9c8ff'], true),
  M('grainy', 'Grainy Gradient', ['#ff7a59', '#7a2bff', '#ffd166', '#2bd4ff', '#ff3d81', '#1a0f3a'], { grain: 0.14, power: 2.2 }),
]

const L = (id: string, name: string, colors: string[], variant: number, o: { scale?: number; speed?: number; light?: boolean } = {}): ShaderTheme =>
  ({ id, name, program: 'liquid', colors, params: [o.scale ?? 2.2, 0.035, o.speed ?? 0.5, variant], light: o.light })

export const ABSTRACT_SHADERS: ShaderTheme[] = [
  { id: 'fleur', name: 'Fleur', program: 'soft', colors: ['#bcd8ff', '#ffe3cf', '#fff3e6', '#ff8a5c', '#7fb08a', '#ff5c5c'], params: [0, 0.04, 0.5, 0], light: true },
  L('ripple', 'Ripple', ['#2f8bff', '#bfe6ff', '#ffffff', '#0a3fd6'], 0, { scale: 1.1, speed: 0.45 }),
  L('pink-ripple', 'Pink Ripple', ['#ff6f9f', '#ffd6e3', '#ffffff', '#d81b60'], 0, { scale: 1.1, speed: 0.45, light: true }),
  { id: 'rainbow-road', name: 'Rainbow Road', program: 'streak', colors: ['#020204'], params: [0, 0.03, 1, 0] },
  L('sonar', 'Sonar', ['#0a1b4f', '#2b7bff', '#a9d6ff', '#040a20'], 2, { scale: 1.3, speed: 0.4 }),
  { id: 'prism', name: 'Prism', program: 'prism', colors: ['#06040c', '#ff3d81', '#2b6bff', '#ffb000', '#8b3dff'], params: [0, 0.04, 0.7, 0] },
  L('cirrus', 'Cirrus', ['#2f6bff', '#ffffff', '#9cc0ff', '#ffffff'], 3, { scale: 1.8, speed: 0.35, light: true }),
  L('pink-silk', 'Pink Silk', ['#d6163c', '#ffb3c6', '#fff0f3', '#7a0018'], 1, { scale: 1.0, speed: 0.35 }),
  { id: 'sunburst', name: 'Sunburst', program: 'sunburst', colors: ['#5b3ea8', '#ff7a4f', '#ffb15c', '#ffe1a0'], params: [0, 0.04, 0.5, 0] },
  { id: 'dove', name: 'Dove', program: 'soft', colors: ['#1f4fd8', '#5b8cff', '#9cc0ff', '#ffffff', '#ffffff', '#ffffff'], params: [0, 0.03, 0.6, 1] },
  { id: 'lavender', name: 'Lavender', program: 'soft', colors: ['#c7c9f7', '#e7d9ff', '#ffffff', '#ff7a3c', '#ffb36b', '#ffffff'], params: [0, 0.04, 0.6, 2], light: true },
  { id: 'crt', name: 'CRT', program: 'prism', colors: ['#0a0808'], params: [0, 0.05, 0.6, 1] },
]

export const ANIMATED_SHADERS: ShaderTheme[] = [
  { id: 'lava-lamp', name: 'Lava Lamp', program: 'lava', colors: ['#4c1d95', '#7c3aed', '#ff7a59', '#ff4fa0', '#ffd166'], params: [0, 0.04, 1, 0] },
  M('floe-violet', 'Floe Violet', ['#2a0a6e', '#7432ff', '#c084fc', '#4c1d95', '#a78bfa', '#1a0b3a'], { speed: 0.9 }),
  M('pastel-lofi', 'Pastel Lofi', ['#c7d2fe', '#fbcfe8', '#bae6fd', '#ddd6fe', '#fde68a', '#e0e7ff'], { speed: 0.8, light: true }),
  M('sakura-blush', 'Sakura Blush', ['#ffd1e0', '#ff9ec2', '#ffe8f0', '#f472b6', '#fbcfe8', '#ffffff'], { speed: 0.8, light: true }),
]

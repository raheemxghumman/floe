import { forest, sakura } from './nature'
import { aurora, snow, stars } from './night'
import { ocean, rain, synthwave } from './city'
import { cozy, park, pixel } from './illustrated'
import type { SceneFactory } from './util'

export const SCENES = { forest, rain, stars, aurora, snow, synthwave, ocean, sakura, pixel, park, cozy } satisfies Record<string, SceneFactory>
export type SceneId = keyof typeof SCENES

const thumbCache = new Map<string, string>()
/** Renders a scene a few frames in and returns a JPEG data URL for theme cards. */
export function sceneThumb(id: SceneId, w = 320, h = 180) {
  const key = `${id}-${w}x${h}`
  const hit = thumbCache.get(key)
  if (hit) return hit
  const cv = document.createElement('canvas')
  cv.width = w * 2; cv.height = h * 2
  const ctx = cv.getContext('2d')!
  ctx.scale(2, 2)
  const s = SCENES[id](ctx, w, h, 2)
  for (let i = 0; i < 4; i++) s.draw(4 + i * 0.016, 0.016)
  const url = cv.toDataURL('image/jpeg', 0.82)
  thumbCache.set(key, url)
  return url
}

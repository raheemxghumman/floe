// Companion levels. XP is derived from synced history (never stored), so it's the same on every device.
import { useMemo } from 'react'
import { useStore, type AccessoryId, type CompanionId, type Session } from '../store'
import { useAccount } from './account'

export const XP_RULES = { perFocusMinute: 1, perTask: 5, perActiveDay: 20 }

export function xpFrom(sessions: Session[], tasksCompleted: number) {
  let minutes = 0
  const days = new Set<string>()
  for (const s of sessions) {
    if (s.type !== 'focus') continue
    minutes += s.minutes
    const d = new Date(s.at)
    days.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`)
  }
  return Math.round(minutes * XP_RULES.perFocusMinute + tasksCompleted * XP_RULES.perTask + days.size * XP_RULES.perActiveDay)
}

/** Total XP needed to reach a level: 0, 50, 150, 300, 500, 750 … (grows gently). */
export const xpToReach = (level: number) => 25 * (level - 1) * level
export const levelFor = (xp: number) => Math.max(1, Math.floor((1 + Math.sqrt(1 + (4 * xp) / 25)) / 2))

const TITLES = ['Seedling', 'Sprout', 'Getting Started', 'Focused', 'In the Flow', 'Deep Diver', 'Time Bender', 'Calm Mind', 'Zen Master', 'Legend']
export const titleFor = (level: number) => TITLES[Math.min(TITLES.length - 1, Math.floor((level - 1) / 2))]

export type Reward =
  | { level: number; kind: 'companion'; id: CompanionId; label: string }
  | { level: number; kind: 'accessory'; id: AccessoryId; label: string }
  | { level: number; kind: 'effect'; id: 'sparkles' | 'golden'; label: string }

export const REWARDS: Reward[] = [
  { level: 1, kind: 'companion', id: 'tomato', label: 'Tomato' },
  { level: 1, kind: 'companion', id: 'sprout', label: 'Sprout' },
  { level: 2, kind: 'companion', id: 'cat', label: 'Mochi the cat' },
  { level: 3, kind: 'accessory', id: 'headphones', label: 'Headphones' },
  { level: 4, kind: 'companion', id: 'fox', label: 'Kit the fox' },
  { level: 5, kind: 'accessory', id: 'party', label: 'Party hat' },
  { level: 6, kind: 'companion', id: 'ghost', label: 'Boo the ghost' },
  { level: 7, kind: 'accessory', id: 'flowers', label: 'Flower crown' },
  { level: 8, kind: 'companion', id: 'robot', label: 'Bit the robot' },
  { level: 9, kind: 'accessory', id: 'wizard', label: 'Wizard hat' },
  { level: 10, kind: 'effect', id: 'sparkles', label: 'Sparkle aura' },
  { level: 12, kind: 'accessory', id: 'crown', label: 'Golden crown' },
  { level: 15, kind: 'effect', id: 'golden', label: 'Golden glow' },
]

export const unlockLevel = (kind: Reward['kind'], id: string) => REWARDS.find((r) => r.kind === kind && r.id === id)?.level ?? 1
export const isUnlocked = (kind: Reward['kind'], id: string, level: number) => id === 'none' || level >= unlockLevel(kind, id)
export const rewardsAt = (level: number) => REWARDS.filter((r) => r.level === level)

export interface LevelInfo { xp: number; level: number; floor: number; next: number; progress: number; title: string; infinite?: boolean }

/** Admins (the owner) have everything unlocked. */
export const INFINITE: LevelInfo = { xp: Infinity, level: 99, floor: 0, next: Infinity, progress: 1, title: 'Owner', infinite: true }

export function levelInfo(xp: number): LevelInfo {
  const level = levelFor(xp)
  const floor = xpToReach(level), next = xpToReach(level + 1)
  return { xp, level, floor, next, progress: (xp - floor) / (next - floor), title: titleFor(level) }
}

export function useLevel(): LevelInfo {
  const sessions = useStore((s) => s.sessions)
  const tasksCompleted = useStore((s) => s.tasksCompleted)
  const profile = useAccount((s) => s.profile)
  const infinite = profile?.role === 'admin' && profile.status === 'active'
  const bonus = profile?.bonus_xp ?? 0
  return useMemo(
    () => (infinite ? INFINITE : levelInfo(xpFrom(sessions, tasksCompleted) + bonus)),
    [sessions, tasksCompleted, bonus, infinite],
  )
}

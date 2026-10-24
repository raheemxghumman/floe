import { Check, Infinity as InfinityIcon, Lock, Sparkle, Trophy } from 'lucide-react'
import { useStore, type AccessoryId } from '../../store'
import { REWARDS, XP_RULES, isUnlocked, unlockLevel, useLevel } from '../../lib/levels'
import { ACCESSORIES, COMPANIONS, CompanionArt } from '../companions'
import { Row, Section, Seg, Toggle } from './controls'
import { CompanionPicker, ModeTarget } from './ModesSection'

const EFFECTS: { v: 'none' | 'sparkles' | 'golden'; label: string }[] = [{ v: 'none', label: 'None' }, { v: 'sparkles', label: 'Sparkle aura' }, { v: 'golden', label: 'Golden glow' }]

export function CompanionsSection() {
  const info = useLevel()
  const pet = useStore((s) => s.settings.pet)
  const target = useStore((s) => s.themeTarget)
  const current = useStore((s) => s.settings.modes[s.themeTarget].companion)
  const shown = current === 'none' ? 'tomato' : current
  const { updatePet, updateMode, setView } = useStore.getState()
  const pct = info.infinite ? 100 : Math.round(info.progress * 100)

  return (
    <>
      <Section title="Companions" sub="Buddies that work alongside you. Focus more to level up and unlock new friends and gear.">
        <div className={`lvl-hero ${info.infinite ? 'infinite' : ''}`}>
          <div className="lvl-hero-pet">
            <CompanionArt id={shown} state="work" level={info.level}
              accessory={isUnlocked('accessory', pet.accessory, info.level) ? pet.accessory : 'none'}
              effect={pet.effect !== 'none' && isUnlocked('effect', pet.effect, info.level) ? pet.effect : 'none'} />
          </div>
          <div className="lvl-hero-text">
            <span className="lvl-badge"><Trophy size={13} /> {info.infinite ? 'Owner' : `Level ${info.level}`}</span>
            <strong>{info.title}</strong>
            <div className="xp-bar"><div style={{ width: `${pct}%` }} /></div>
            <span className="muted small">
              {info.infinite
                ? <><InfinityIcon size={12} /> Infinite XP. Everything unlocked.</>
                : <>{Math.round(info.xp - info.floor)} / {info.next - info.floor} XP to level {info.level + 1} · {Math.round(info.xp)} XP total</>}
            </span>
            <span className="muted small">+{XP_RULES.perFocusMinute} XP per focus minute · +{XP_RULES.perTask} per task done · +{XP_RULES.perActiveDay} per active day</span>
          </div>
        </div>
      </Section>

      <Section title="Choose a companion">
        <div className="theme-target"><span className="muted small">For</span><ModeTarget /></div>
        <CompanionPicker value={current} onPick={(id) => { updateMode(target, { companion: id }); setView(target) }} includeNone />
        {current !== 'none' && <p className="muted small pet-blurb">{COMPANIONS[current].blurb}</p>}
      </Section>

      <Section title="Accessories">
        <div className="acc-grid">
          {(Object.keys(ACCESSORIES) as AccessoryId[]).map((id) => {
            const open = isUnlocked('accessory', id, info.level)
            const Art = ACCESSORIES[id].Art
            return (
              <button key={id} className={`acc-chip ${pet.accessory === id ? 'on' : ''} ${open ? '' : 'locked'}`} onClick={() => open && updatePet({ accessory: id })} disabled={!open}>
                <svg viewBox="-44 -52 88 64" aria-hidden><Art /></svg>
                <span>{ACCESSORIES[id].label}</span>
                {!open && <em><Lock size={10} /> Lv {unlockLevel('accessory', id)}</em>}
              </button>
            )
          })}
        </div>
      </Section>

      <Section title="Style">
        <Row label="Effect">
          <div className="seg-wrap">
            {EFFECTS.map((e) => {
              const open = e.v === 'none' || isUnlocked('effect', e.v, info.level)
              return (
                <button key={e.v} className={`chip ${pet.effect === e.v ? 'on' : ''}`} style={{ ['--hue' as string]: '#9b6bff' }} disabled={!open} onClick={() => updatePet({ effect: e.v })}>
                  {e.v !== 'none' && <Sparkle size={12} />} {e.label}{!open && ` · Lv ${unlockLevel('effect', e.v)}`}
                </button>
              )
            })}
          </div>
        </Row>
        <Row label="Animation" hint="How much your companion moves">
          <Seg value={pet.motion} onChange={(v) => updatePet({ motion: v })} options={[{ v: 'lively', label: 'Lively' }, { v: 'calm', label: 'Calm' }, { v: 'still', label: 'Still' }]} />
        </Row>
        <Row label="Speech bubbles" hint="Little encouragements when sessions start and end">
          <Toggle on={pet.chatter} onChange={(v) => updatePet({ chatter: v })} />
        </Row>
      </Section>

      <Section title="Rewards" sub="Everything you can unlock.">
        <ul className="rewards">
          {REWARDS.map((r) => {
            const got = info.level >= r.level
            return (
              <li key={r.kind + r.id} className={got ? 'got' : ''}>
                <span className="rw-lvl">{r.level}</span>
                <span className="rw-label">{r.label}<em>{r.kind}</em></span>
                {got ? <Check size={15} className="rw-ok" /> : <Lock size={14} className="muted" />}
              </li>
            )
          })}
        </ul>
      </Section>
    </>
  )
}

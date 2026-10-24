import { useEffect, useMemo, useReducer, useState } from 'react'
import {
  AudioLines, Bird, CloudRain, Flame, ListMusic, LogOut, Music, Pause, Play, Search, SkipBack, SkipForward,
  Smartphone, Waves, Wind, X,
} from 'lucide-react'
import { useStore } from '../../store'
import { ambient, type AmbientId } from '../../lib/audio'
import {
  api, clientIdFor, embedSrc, isConnected, login, logout, parseSpotify, playlistItem, playOnDevice, PRESETS, searchSpotify,
  type Me, type MusicItem, type Playback, type Playlist,
} from '../../lib/spotify'
import { toast } from '../../hooks'
import { spotifyAccessMessage, whatsappLink } from '../../lib/owner'
import { useAccount } from '../../lib/account'
import { WhatsAppGlyph } from '../AuthGate'
import { FloatingPanel } from './FloatingPanel'

export function SpotifyGlyph({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="12" fill="#1ed760" />
      <path d="M6.5 9.2c3.6-1 7.6-.7 10.9 1.1M7.2 12.4c2.9-.8 6.1-.5 8.8 1M7.9 15.4c2.3-.6 4.6-.4 6.6.8" stroke="#000" strokeWidth="1.6" strokeLinecap="round" fill="none" />
    </svg>
  )
}

const PRESET_ITEMS: MusicItem[] = PRESETS.map((p) => ({ uri: p.uri, name: p.name, sub: 'Focus pick', kind: 'preset', hue: p.hue }))

function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = window.setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

function useSpotifyConnected() {
  const [connected, setConnected] = useState(isConnected())
  useEffect(() => {
    const on = () => setConnected(isConnected())
    window.addEventListener('floe-spotify', on)
    return () => window.removeEventListener('floe-spotify', on)
  }, [])
  return connected
}

/* -------------------------------------------------------------- rows */

function ItemRow({ item, active, onPick, onDevice }: { item: MusicItem; active: boolean; onPick: () => void; onDevice?: () => void }) {
  return (
    <li className={`sp-item ${active ? 'on' : ''}`}>
      <button className="sp-item-main" onClick={onPick} title="Play here">
        {item.image
          ? <img src={item.image} alt="" className={item.kind === 'track' ? 'round' : ''} loading="lazy" />
          : <span className="sp-ph" style={{ background: item.hue ? `linear-gradient(135deg, ${item.hue}, #1a1626)` : undefined }}><Music size={14} /></span>}
        <span className="sp-item-text">
          <span className="sp-item-name">{item.name}</span>
          <span className="sp-item-sub">{item.sub}</span>
        </span>
        <span className="sp-item-play">{active ? <span className="eq"><i /><i /><i /></span> : <Play size={14} />}</span>
      </button>
      {onDevice && (
        <button className="icon-btn ghost xs sp-device" onClick={onDevice} title="Play on your Spotify app" aria-label="Play on your Spotify app">
          <Smartphone size={14} />
        </button>
      )}
    </li>
  )
}

/* ------------------------------------------------------- spotify tab */

function SpotifyTab({ open }: { open: boolean }) {
  const { uri, compact } = useStore((s) => s.settings.spotify)
  const clientId = clientIdFor(useStore((s) => s.settings.spotify.clientId))
  const { updateSpotify, openSettings } = useStore.getState()
  const connected = useSpotifyConnected()
  const profile = useAccount((s) => s.profile)
  const [mounted, setMounted] = useState(false)
  const [me, setMe] = useState<Me | null>(null)
  const [lists, setLists] = useState<Playlist[]>([])
  const [pb, setPb] = useState<Playback | null>(null)
  // Spotify apps in Development mode reject accounts not on the owner's allow-list with a 403
  const [blocked, setBlocked] = useState(false)
  const [q, setQ] = useState('')
  const [results, setResults] = useState<MusicItem[]>([])
  const [searching, setSearching] = useState(false)
  const debounced = useDebounced(q.trim(), 350)
  const link = parseSpotify(q)

  useEffect(() => { if (open) setMounted(true) }, [open])

  useEffect(() => {
    if (!connected) { setMe(null); setLists([]); return }
    api<Me>('/me').then((m) => { setMe(m); setBlocked(false) }).catch((e: Error) => { if (/403/.test(e.message)) setBlocked(true) })
    api<{ items: (Playlist | null)[] }>('/me/playlists?limit=50')
      .then((r) => setLists((r?.items ?? []).filter((p): p is Playlist => !!p)))
      .catch(() => {})
  }, [connected])

  useEffect(() => {
    if (!connected || !open) return
    const poll = () => api<Playback>('/me/player').then(setPb).catch(() => setPb(null))
    poll()
    const id = window.setInterval(poll, 5000)
    return () => clearInterval(id)
  }, [connected, open])

  useEffect(() => {
    if (!connected || debounced.length < 2 || parseSpotify(debounced)) { setResults([]); setSearching(false); return }
    let stale = false
    setSearching(true)
    searchSpotify(debounced)
      .then((r) => { if (!stale) setResults(r) })
      .catch(() => { if (!stale) setResults([]) })
      .finally(() => { if (!stale) setSearching(false) })
    return () => { stale = true }
  }, [debounced, connected])

  const premium = me?.product === 'premium'
  const lists_ = blocked ? [] : lists
  const mine = useMemo(() => lists_.map(playlistItem), [lists_])
  const needle = q.trim().toLowerCase()
  const mineFiltered = needle ? mine.filter((p) => p.name.toLowerCase().includes(needle)) : mine
  const presetsFiltered = needle ? PRESET_ITEMS.filter((p) => p.name.toLowerCase().includes(needle)) : PRESET_ITEMS

  const pick = (item: MusicItem) => updateSpotify({ uri: item.uri })
  const device = premium
    ? async (item: MusicItem) => {
      try { toast(`Playing on ${await playOnDevice(item)}`) }
      catch (e) { toast((e as Error).message === 'no-device' ? 'Open Spotify on your phone or computer first' : 'Spotify couldn’t start playback') }
    }
    : undefined

  const control = async (path: string, method: 'PUT' | 'POST') => {
    try {
      await api(path, { method })
      window.setTimeout(() => api<Playback>('/me/player').then(setPb).catch(() => {}), 400)
    } catch { toast('Spotify didn’t respond, try again') }
  }

  const section = (label: string, items: MusicItem[], withDevice = true) => items.length > 0 && (
    <>
      <div className="sub-label">{label}</div>
      <ul className="sp-results">
        {items.map((it) => (
          <ItemRow key={it.uri} item={it} active={it.uri === uri} onPick={() => pick(it)} onDevice={withDevice && device ? () => void device(it) : undefined} />
        ))}
      </ul>
    </>
  )

  const item = pb?.item
  const art = item?.album?.images?.[0]?.url ?? item?.show?.images?.[0]?.url

  return (
    <div className="sp-tab">
      <div className="sp-embed" style={{ height: compact ? 152 : 352 }}>
        {mounted && (
          <iframe key={uri} title="Spotify player" src={embedSrc(uri)} width="100%" height={compact ? 152 : 352}
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" />
        )}
      </div>

      <div className="sp-bar">
        {connected ? (
          <span className="sp-who">
            {me?.images?.[0] ? <img src={me.images[0].url} alt="" /> : <SpotifyGlyph size={18} />}
            <span>{me?.display_name ?? 'Spotify'}</span>
          </span>
        ) : <span className="muted small">Playing in your browser</span>}
        <span className="sp-bar-actions">
          <button className={`text-btn ${compact ? '' : 'on'}`} onClick={() => updateSpotify({ compact: !compact })}>
            <ListMusic size={13} /> {compact ? 'Show tracks' : 'Hide tracks'}
          </button>
          {connected && <button className="icon-btn ghost xs" onClick={logout} title="Disconnect Spotify" aria-label="Disconnect Spotify"><LogOut size={14} /></button>}
        </span>
      </div>

      {connected && blocked && (
        <div className="sp-blocked">
          <strong>Spotify needs to approve your account</strong>
          <p className="muted">floe’s Spotify app is still in early access, so the owner has to add your Spotify email once. The player above still works.</p>
          <div className="row-inline wrap">
            <a className="btn sm wa" href={whatsappLink(spotifyAccessMessage(profile?.display_name ?? '', profile?.username ?? ''))} target="_blank" rel="noreferrer">
              <WhatsAppGlyph /> Ask on WhatsApp
            </a>
            <button className="btn sm ghost" onClick={logout}>Disconnect</button>
          </div>
        </div>
      )}

      {item && (
        <div className="sp-now">
          {art && <img src={art} alt="" className={pb?.is_playing ? 'spin-slow' : ''} />}
          <div className="sp-now-meta">
            <strong>{item.name}</strong>
            <span className="muted">On {pb?.device?.name ?? 'your device'}</span>
          </div>
          {premium && (
            <div className="sp-ctrl">
              <button className="icon-btn ghost xs" onClick={() => control('/me/player/previous', 'POST')} aria-label="Previous"><SkipBack size={15} /></button>
              <button className="icon-btn solid sm" onClick={() => control(pb?.is_playing ? '/me/player/pause' : '/me/player/play', 'PUT')} aria-label="Play or pause">
                {pb?.is_playing ? <Pause size={15} /> : <Play size={15} />}
              </button>
              <button className="icon-btn ghost xs" onClick={() => control('/me/player/next', 'POST')} aria-label="Next"><SkipForward size={15} /></button>
            </div>
          )}
        </div>
      )}

      <form className="sp-search" onSubmit={(e) => { e.preventDefault(); if (link) { updateSpotify({ uri: link }); setQ('') } }}>
        <Search size={15} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={connected ? 'Search Spotify or your playlists' : 'Search picks or paste a Spotify link'}
          aria-label="Search music"
        />
        {q && <button type="button" className="icon-btn ghost xs" onClick={() => setQ('')} aria-label="Clear search"><X size={14} /></button>}
      </form>

      {link ? (
        <ul className="sp-results">
          <ItemRow item={{ uri: link, name: 'Play this link', sub: link.split(':')[1], kind: 'preset', hue: '#1ed760' }} active={false}
            onPick={() => { updateSpotify({ uri: link }); setQ('') }} />
        </ul>
      ) : needle ? (
        <>
          {section('Your playlists', mineFiltered)}
          {section('Focus picks', presetsFiltered, false)}
          {connected && (
            searching && !results.length
              ? <div className="sp-loading"><span /><span /><span /></div>
              : section('On Spotify', results)
          )}
          {!connected && <p className="muted small sp-hint">Connect your account to search all of Spotify.</p>}
          {connected && !searching && debounced.length >= 2 && !results.length && !mineFiltered.length && (
            <p className="muted small sp-hint">Nothing found for “{q.trim()}”.</p>
          )}
        </>
      ) : (
        <>
          {section('Your playlists', mineFiltered)}
          {section('Focus picks', presetsFiltered, false)}
        </>
      )}

      {!connected && (
        <div className="sp-connect">
          <div>
            <strong>Connect your Spotify</strong>
            <p className="muted">Search everything and play your own playlists.</p>
          </div>
          <button className="btn spotify" onClick={() => (clientId ? void login(clientId) : openSettings('music'))}>
            <SpotifyGlyph /> Connect
          </button>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------- sounds */

const SOUNDS: { id: AmbientId; label: string; icon: typeof CloudRain }[] = [
  { id: 'rain', label: 'Rain', icon: CloudRain },
  { id: 'waves', label: 'Waves', icon: Waves },
  { id: 'wind', label: 'Wind', icon: Wind },
  { id: 'fire', label: 'Fireplace', icon: Flame },
  { id: 'birds', label: 'Birds', icon: Bird },
  { id: 'white', label: 'White', icon: AudioLines },
  { id: 'pink', label: 'Pink', icon: AudioLines },
  { id: 'brown', label: 'Brown', icon: AudioLines },
]

function SoundsTab() {
  const [, force] = useReducer((x: number) => x + 1, 0)
  useEffect(() => ambient.subscribe(force), [])
  const anyOn = ambient.active().length > 0
  return (
    <div className="sounds">
      <div className="sound-grid">
        {SOUNDS.map(({ id, label, icon: Icon }) => {
          const lvl = ambient.level(id)
          return (
            <div key={id} className={`sound ${lvl > 0 ? 'on' : ''}`}>
              <button className="sound-btn" onClick={() => ambient.set(id, lvl > 0 ? 0 : 0.5)}>
                <Icon size={20} />
                <span>{label}{id === 'white' || id === 'pink' || id === 'brown' ? ' noise' : ''}</span>
              </button>
              <input
                type="range" min={0} max={1} step={0.01} value={lvl}
                onChange={(e) => ambient.set(id, Number(e.target.value))}
                aria-label={`${label} volume`}
                style={{ ['--v' as string]: lvl }}
              />
            </div>
          )
        })}
      </div>
      <div className="sound-foot">
        <span className="muted small">Mix as many as you like. Generated live, nothing to download.</span>
        {anyOn && <button className="text-btn" onClick={() => ambient.stopAll()}>Stop all</button>}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------- panel */

export function MusicPanel() {
  const open = useStore((s) => s.panels.music)
  const [tab, setTab] = useState<'spotify' | 'sounds'>('spotify')

  return (
    <FloatingPanel
      id="music"
      width={380}
      left={24 + 340 + 16 + 360 + 16}
      title={
        <div className="seg sm" style={{ ['--i' as string]: tab === 'spotify' ? 0 : 1 }}>
          <span className="seg-ind" />
          <button className={tab === 'spotify' ? 'on' : ''} onClick={() => setTab('spotify')}><SpotifyGlyph size={13} /> Spotify</button>
          <button className={tab === 'sounds' ? 'on' : ''} onClick={() => setTab('sounds')}><Waves size={13} /> Sounds</button>
        </div>
      }
    >
      <div className={tab === 'spotify' ? '' : 'tab-hidden'}>
        <SpotifyTab open={open && tab === 'spotify'} />
      </div>
      <div className={tab === 'sounds' ? '' : 'tab-hidden'}>
        <SoundsTab />
      </div>
    </FloatingPanel>
  )
}

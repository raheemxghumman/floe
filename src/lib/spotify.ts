// Spotify Web API via Authorization Code + PKCE — no backend needed.
// Docs: https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow

const TOKEN_KEY = 'floe-spotify-token'
const VERIFIER_KEY = 'floe-spotify-verifier'
const SCOPES = [
  'user-read-private',
  'playlist-read-private',
  'playlist-read-collaborative',
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
].join(' ')

export const redirectUri = () => `${window.location.origin}/app`

/** Baked in at build time by whoever deploys floe — users never see or enter it. */
export const BUILT_IN_CLIENT_ID = ((import.meta.env.VITE_SPOTIFY_CLIENT_ID as string | undefined) ?? '').trim()
/** The built-in ID always wins; a pasted override only matters on builds without one. */
export const clientIdFor = (override: string) => BUILT_IN_CLIENT_ID || override.trim()

interface Token { access: string; refresh: string; expires: number; clientId: string }

const b64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

function readToken(): Token | null {
  try { return JSON.parse(localStorage.getItem(TOKEN_KEY) ?? 'null') } catch { return null }
}
function writeToken(t: Token | null) {
  if (t) localStorage.setItem(TOKEN_KEY, JSON.stringify(t))
  else localStorage.removeItem(TOKEN_KEY)
  window.dispatchEvent(new Event('floe-spotify'))
}

export const isConnected = () => readToken() !== null

export async function login(clientId: string) {
  const verifierBytes = crypto.getRandomValues(new Uint8Array(48))
  const verifier = b64url(verifierBytes)
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)))
  localStorage.setItem(VERIFIER_KEY, JSON.stringify({ verifier, clientId }))
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    scope: SCOPES,
    code_challenge_method: 'S256',
    code_challenge: b64url(digest),
    redirect_uri: redirectUri(),
  })
  window.location.href = `https://accounts.spotify.com/authorize?${params}`
}

/** Call once on boot: finishes the OAuth redirect if ?code= is present. */
export async function handleRedirect(): Promise<string | null> {
  const url = new URL(window.location.href)
  const code = url.searchParams.get('code')
  const error = url.searchParams.get('error')
  if (!code && !error) return null
  url.searchParams.delete('code'); url.searchParams.delete('error'); url.searchParams.delete('state')
  window.history.replaceState({}, '', url.pathname + url.search + url.hash)
  if (error) return `Spotify: ${error}`

  const saved = JSON.parse(localStorage.getItem(VERIFIER_KEY) ?? 'null') as { verifier: string; clientId: string } | null
  localStorage.removeItem(VERIFIER_KEY)
  if (!saved) return 'Spotify login expired, try again.'
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: code!,
      redirect_uri: redirectUri(),
      client_id: saved.clientId,
      code_verifier: saved.verifier,
    }),
  })
  if (!res.ok) return `Spotify login failed (${res.status})`
  const j = await res.json()
  writeToken({ access: j.access_token, refresh: j.refresh_token, expires: Date.now() + j.expires_in * 1000, clientId: saved.clientId })
  return null
}

async function accessToken(): Promise<string | null> {
  const t = readToken()
  if (!t) return null
  if (Date.now() < t.expires - 60_000) return t.access
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: t.refresh, client_id: t.clientId }),
  })
  if (!res.ok) { writeToken(null); return null }
  const j = await res.json()
  writeToken({ ...t, access: j.access_token, refresh: j.refresh_token ?? t.refresh, expires: Date.now() + j.expires_in * 1000 })
  return j.access_token
}

export function logout() { writeToken(null) }

export async function api<T = unknown>(path: string, init: RequestInit = {}): Promise<T | null> {
  const token = await accessToken()
  if (!token) return null
  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...init.headers },
  })
  if (res.status === 401) { logout(); return null }
  if (res.status === 204 || res.status === 202) return null
  if (!res.ok) throw new Error(`Spotify ${res.status}`)
  const text = await res.text()
  return text ? (JSON.parse(text) as T) : null
}

export interface SpotifyImage { url: string }
export interface Me { display_name: string; images: SpotifyImage[]; product: string }
export interface Playlist { id: string; name: string; uri: string; images: SpotifyImage[] | null; tracks: { total: number } }
export interface Playback {
  is_playing: boolean
  device: { name: string } | null
  item: { name: string; artists?: { name: string }[]; album?: { images: SpotifyImage[] }; show?: { name: string; images: SpotifyImage[] } } | null
}

interface Album { uri: string; name: string; images: SpotifyImage[]; artists: { name: string }[] }
interface Track { uri: string; name: string; artists: { name: string }[]; album: { images: SpotifyImage[] } }
interface Device { id: string; name: string; is_active: boolean }

/** One row in the music list, whatever Spotify type it came from. */
export interface MusicItem { uri: string; name: string; sub: string; image?: string; kind: 'playlist' | 'album' | 'track' | 'preset'; hue?: string }

// smallest image that's still ≥ 64px keeps lists light
const thumb = (imgs?: SpotifyImage[] | null) => (imgs?.length ? (imgs[imgs.length - 1] ?? imgs[0]).url : undefined)

export const playlistItem = (p: Playlist): MusicItem =>
  ({ uri: p.uri, name: p.name, sub: `Playlist · ${p.tracks?.total ?? 0} tracks`, image: thumb(p.images), kind: 'playlist' })

export async function searchSpotify(q: string): Promise<MusicItem[]> {
  const params = new URLSearchParams({ q, type: 'playlist,album,track', limit: '6' })
  const r = await api<{ playlists?: { items: (Playlist | null)[] }; albums?: { items: Album[] }; tracks?: { items: Track[] } }>(`/search?${params}`)
  if (!r) return []
  const playlists = (r.playlists?.items ?? []).filter((p): p is Playlist => !!p).map(playlistItem)
  const albums = (r.albums?.items ?? []).map((a): MusicItem => ({ uri: a.uri, name: a.name, sub: `Album · ${a.artists.map((x) => x.name).join(', ')}`, image: thumb(a.images), kind: 'album' }))
  const tracks = (r.tracks?.items ?? []).map((t): MusicItem => ({ uri: t.uri, name: t.name, sub: `Song · ${t.artists.map((x) => x.name).join(', ')}`, image: thumb(t.album.images), kind: 'track' }))
  // interleave so one type doesn't bury the others
  const out: MusicItem[] = []
  for (let i = 0; i < 6; i++) for (const list of [playlists, tracks, albums]) if (list[i]) out.push(list[i])
  return out
}

/** Plays on the active Spotify device, or wakes the first available one. Returns its name. */
export async function playOnDevice(item: MusicItem): Promise<string> {
  const r = await api<{ devices: Device[] }>('/me/player/devices')
  const d = r?.devices.find((x) => x.is_active) ?? r?.devices[0]
  if (!d) throw new Error('no-device')
  const body = item.kind === 'track' ? { uris: [item.uri] } : { context_uri: item.uri }
  await api(`/me/player/play?device_id=${d.id}`, { method: 'PUT', body: JSON.stringify(body) })
  return d.name
}

/* ---------------------------------------------------- embeds (no login) */

/** Turns any open.spotify.com URL or spotify: URI into an embed src. */
export function parseSpotify(input: string): string | null {
  const s = input.trim()
  const uri = s.match(/^spotify:(playlist|album|track|artist|show|episode):([A-Za-z0-9]+)$/)
  if (uri) return `spotify:${uri[1]}:${uri[2]}`
  const url = s.match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?(playlist|album|track|artist|show|episode)\/([A-Za-z0-9]+)/)
  if (url) return `spotify:${url[1]}:${url[2]}`
  return null
}

export function embedSrc(uri: string) {
  const [, type, id] = uri.split(':')
  return `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`
}

export const PRESETS: { name: string; uri: string; hue: string }[] = [
  { name: 'Lofi Beats', uri: 'spotify:playlist:37i9dQZF1DWWQRwui0ExPn', hue: '#8b5cf6' },
  { name: 'Deep Focus', uri: 'spotify:playlist:37i9dQZF1DWZeKCadgRdKQ', hue: '#0ea5e9' },
  { name: 'Peaceful Piano', uri: 'spotify:playlist:37i9dQZF1DX4sWSpwq3LiO', hue: '#a3a3a3' },
  { name: 'Brain Food', uri: 'spotify:playlist:37i9dQZF1DWXLeA8Omikj7', hue: '#f97316' },
  { name: 'Jazz Vibes', uri: 'spotify:playlist:37i9dQZF1DX0SM0LYsmbMT', hue: '#eab308' },
  { name: 'Instrumental Study', uri: 'spotify:playlist:37i9dQZF1DX9sIqqvKsjG8', hue: '#22c55e' },
]

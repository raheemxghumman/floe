// Uploaded background images/videos live in IndexedDB (too big for localStorage).

const DB = 'floe-media'
const STORE = 'files'

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open()
  return new Promise((resolve, reject) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE))
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export const saveMedia = (key: string, file: Blob) => tx('readwrite', (s) => s.put(file, key))
export const deleteMedia = (key: string) => tx('readwrite', (s) => s.delete(key))

const urlCache = new Map<string, string>()
export async function mediaUrl(key: string): Promise<string | null> {
  const hit = urlCache.get(key)
  if (hit) return hit
  const blob = await tx<Blob | undefined>('readonly', (s) => s.get(key) as IDBRequest<Blob | undefined>)
  if (!blob) return null
  const url = URL.createObjectURL(blob)
  urlCache.set(key, url)
  return url
}

export function youtubeId(input: string): string | null {
  const m = input.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|live\/|shorts\/))([A-Za-z0-9_-]{11})/)
  if (m) return m[1]
  return /^[A-Za-z0-9_-]{11}$/.test(input.trim()) ? input.trim() : null
}

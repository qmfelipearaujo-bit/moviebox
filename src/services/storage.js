const KEYS = {
  favorites: 'moviebox:favorites',
  history: 'moviebox:history',
  downloads: 'moviebox:downloads',
}

function read(key, fallback = []) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback))
  } catch {
    return fallback
  }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
  window.dispatchEvent(new CustomEvent('moviebox-storage-changed'))
  return value
}

export function getFavorites() {
  return read(KEYS.favorites)
}

export function isFavorite(id, mediaType) {
  return getFavorites().some((item) => String(item.id) === String(id) && item.media_type === mediaType)
}

export function toggleFavorite(media) {
  const items = getFavorites()
  const exists = items.some((item) => String(item.id) === String(media.id) && item.media_type === media.media_type)
  return write(KEYS.favorites, exists
    ? items.filter((item) => !(String(item.id) === String(media.id) && item.media_type === media.media_type))
    : [media, ...items].slice(0, 250))
}

export function getHistory() {
  return read(KEYS.history)
}

export function addToHistory(media, playback = {}) {
  const items = getHistory().filter((item) => !(String(item.id) === String(media.id) && item.media_type === media.media_type))
  const next = [{ ...media, ...playback, watchedAt: Date.now() }, ...items].slice(0, 100)
  return write(KEYS.history, next)
}

export function clearHistory() {
  return write(KEYS.history, [])
}

export function getDownloads() {
  return read(KEYS.downloads)
}

export function registerDownload(item) {
  const items = getDownloads().filter((x) => x.downloadId !== item.downloadId)
  return write(KEYS.downloads, [item, ...items].slice(0, 100))
}

export function removeDownload(downloadId) {
  return write(KEYS.downloads, getDownloads().filter((x) => x.downloadId !== downloadId))
}


export function replaceFavorites(items = []) {
  return write(KEYS.favorites, Array.isArray(items) ? items.slice(0, 250) : [])
}

export function replaceHistory(items = []) {
  return write(KEYS.history, Array.isArray(items) ? items.slice(0, 100) : [])
}

export function getLibrarySnapshot() {
  return { favorites: getFavorites(), history: getHistory() }
}

export function mergeLibrarySnapshot(snapshot = {}) {
  const favMap = new Map()
  ;[...(snapshot.favorites || []), ...getFavorites()].forEach((item) => favMap.set(`${item.media_type}:${item.id}`, item))
  const historyMap = new Map()
  ;[...(snapshot.history || []), ...getHistory()].forEach((item) => {
    const key = `${item.media_type}:${item.id}`
    const prev = historyMap.get(key)
    if (!prev || Number(item.watchedAt || 0) > Number(prev.watchedAt || 0)) historyMap.set(key, item)
  })
  replaceFavorites([...favMap.values()].slice(0, 250))
  replaceHistory([...historyMap.values()].sort((a,b) => Number(b.watchedAt || 0)-Number(a.watchedAt || 0)).slice(0, 100))
  return getLibrarySnapshot()
}

// Compatibilidade com versões antigas do código.
export const registerAuthorizedDownload = registerDownload

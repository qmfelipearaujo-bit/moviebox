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

export function registerAuthorizedDownload(item) {
  const items = getDownloads().filter((x) => x.downloadId !== item.downloadId)
  return write(KEYS.downloads, [item, ...items].slice(0, 100))
}

export function removeDownload(downloadId) {
  return write(KEYS.downloads, getDownloads().filter((x) => x.downloadId !== downloadId))
}

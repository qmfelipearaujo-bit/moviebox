const KEY = 'moviebox:custom-sources'

function read() {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

function write(items) {
  localStorage.setItem(KEY, JSON.stringify(items))
  window.dispatchEvent(new CustomEvent('moviebox-custom-sources-changed'))
  return items
}

export function getCustomSources() {
  return read()
}

export function addCustomSource(input) {
  const url = String(input?.url || '').trim()
  const title = String(input?.title || '').trim() || 'Fonte personalizada'
  if (!url) throw new Error('Informe uma URL ou magnet.')
  const type = /^magnet:/i.test(url) ? 'magnet' : /\.torrent(?:\?|$)/i.test(url) ? 'torrent' : /^https?:\/\//i.test(url) ? 'direct' : 'unknown'
  if (type === 'unknown') throw new Error('Use uma URL HTTP/HTTPS, um arquivo .torrent ou um magnet link.')
  const id = `custom:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`
  const item = {
    id,
    title,
    url,
    type,
    license: String(input?.license || '').trim() || 'Fonte informada pelo usuário',
    poster: String(input?.poster || '').trim(),
    addedAt: Date.now(),
  }
  return write([item, ...read()].slice(0, 100))
}

export function removeCustomSource(id) {
  return write(read().filter((item) => item.id !== id))
}

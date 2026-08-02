const KEY = 'moviebox:live-tv-custom'

export const STARTER_TV = [
  {
    id: 'tvbrasil',
    name: 'TV Brasil',
    country: 'Brasil',
    flag: '🇧🇷',
    type: 'iframe',
    url: 'https://aovivo.ebc.com.br/embed-tvbrasil.html',
    homepage: 'https://tvbrasil.ebc.com.br/webtv/',
    note: 'Transmissão oficial EBC; parte da programação pode ter restrição de direitos na Web.',
  },
  {
    id: 'tvm-moz',
    name: 'TVM Moçambique',
    country: 'Moçambique',
    flag: '🇲🇿',
    type: 'iframe',
    url: 'https://online.tvm.co.mz/tvm_online.php',
    homepage: 'https://online.tvm.co.mz/tvm_online.php',
    note: 'Página oficial de transmissão online da TVM. Se o iframe não carregar, use Abrir oficial.',
  },
  {
    id: 'nasa-live',
    name: 'NASA Live / NASA+',
    country: 'Estados Unidos',
    flag: '🇺🇸',
    type: 'external',
    url: 'https://www.nasa.gov/live/',
    homepage: 'https://www.nasa.gov/live/',
    note: 'Programação oficial gratuita da NASA; eventos ao vivo variam conforme a agenda.',
  },
]

export function getCustomTv() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
}

export function addCustomTv(item) {
  const rows = getCustomTv()
  const next = [{ id: `tv-${Date.now()}`, ...item }, ...rows].slice(0, 100)
  localStorage.setItem(KEY, JSON.stringify(next))
  window.dispatchEvent(new CustomEvent('moviebox-live-changed'))
  return next
}

export function removeCustomTv(id) {
  const next = getCustomTv().filter((x) => x.id !== id)
  localStorage.setItem(KEY, JSON.stringify(next))
  window.dispatchEvent(new CustomEvent('moviebox-live-changed'))
  return next
}

export function detectTvType(url = '') {
  const value = String(url).trim().toLowerCase()
  if (/\.(m3u8)(\?|$)/.test(value)) return 'video'
  if (/\.(mp4|webm|m4v)(\?|$)/.test(value)) return 'video'
  if (value.includes('youtube.com/embed/') || value.includes('youtu.be/embed/')) return 'iframe'
  return 'iframe'
}

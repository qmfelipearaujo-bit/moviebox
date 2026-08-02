const API = 'https://de1.api.radio-browser.info/json'

export const RADIO_COUNTRIES = [
  { code: 'BR', label: 'Brasil', flag: '🇧🇷' },
  { code: 'US', label: 'Estados Unidos', flag: '🇺🇸' },
  { code: 'MZ', label: 'Moçambique', flag: '🇲🇿' },
]

export async function getRadiosByCountry(code, search = '') {
  const url = new URL(`${API}/stations/bycountrycodeexact/${encodeURIComponent(code)}`)
  url.searchParams.set('hidebroken', 'true')
  url.searchParams.set('order', 'clickcount')
  url.searchParams.set('reverse', 'true')
  url.searchParams.set('limit', '80')
  const response = await fetch(url)
  if (!response.ok) throw new Error(`RADIO_${response.status}`)
  let rows = await response.json()
  rows = rows.filter((x) => x.url_resolved || x.url)
  if (search.trim()) {
    const q = search.trim().toLowerCase()
    rows = rows.filter((x) => `${x.name} ${x.tags} ${x.state}`.toLowerCase().includes(q))
  }
  return rows.slice(0, 50).map((x) => ({
    id: x.stationuuid,
    name: x.name || 'Rádio sem nome',
    url: x.url_resolved || x.url,
    favicon: x.favicon || '',
    tags: x.tags || '',
    country: x.country || '',
    state: x.state || '',
    codec: x.codec || '',
    bitrate: Number(x.bitrate || 0),
    homepage: x.homepage || '',
  }))
}

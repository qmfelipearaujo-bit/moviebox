const API = 'https://commons.wikimedia.org/w/api.php'

function stripHtml(value = '') {
  const node = document.createElement('div')
  node.innerHTML = value
  return (node.textContent || '').trim()
}

function normalizeDerivative(d, durationSeconds) {
  const url = d.src || d.url
  if (!url) return null
  const width = Number(d.width || 0)
  const height = Number(d.height || 0)
  const type = String(d.type || d.mime || '').toLowerCase()
  if (type && !type.includes('video') && !url.includes('.webm')) return null
  const bandwidth = Number(d.bandwidth || 0)
  const estimatedBytes = bandwidth && durationSeconds ? Math.round((bandwidth * durationSeconds) / 8) : null
  return {
    url,
    width,
    height,
    quality: height ? `${height}p` : width ? `${width}px` : 'Transcodificado',
    mime: d.type || d.mime || 'video/webm',
    estimatedBytes,
    original: false,
  }
}

export async function getCommonsMedia(item) {
  const params = new URLSearchParams({
    action: 'query',
    prop: 'videoinfo',
    titles: item.fileTitle,
    viprop: 'url|size|mime|derivatives|extmetadata',
    viurlwidth: '700',
    format: 'json',
    origin: '*',
  })
  const res = await fetch(`${API}?${params}`)
  if (!res.ok) throw new Error(`Commons respondeu ${res.status}`)
  const json = await res.json()
  const page = Object.values(json.query?.pages || {})[0]
  const info = page?.videoinfo?.[0]
  if (!info) throw new Error('Arquivo não encontrado no Wikimedia Commons.')

  const derivatives = (info.derivatives || [])
    .map((d) => normalizeDerivative(d, item.durationSeconds))
    .filter(Boolean)

  const original = info.url ? {
    url: info.url,
    width: Number(info.width || 0),
    height: Number(info.height || 0),
    quality: info.height ? `${info.height}p original` : 'Original',
    mime: info.mime || 'video/webm',
    estimatedBytes: Number(info.size || 0) || null,
    original: true,
  } : null

  const candidates = [...derivatives]
  if (original) candidates.push(original)

  const preferredHeights = [360, 480, 720, 1080]
  const byHeight = new Map()
  for (const option of candidates) {
    if (!option.url) continue
    const key = option.height || option.quality
    const old = byHeight.get(key)
    if (!old || (old.original && !option.original)) byHeight.set(key, option)
  }

  let options = [...byHeight.values()]
    .filter((o) => !o.height || o.height <= 1080)
    .sort((a, b) => {
      const ai = preferredHeights.indexOf(a.height)
      const bi = preferredHeights.indexOf(b.height)
      if (ai >= 0 && bi >= 0) return ai - bi
      return (a.height || 9999) - (b.height || 9999)
    })

  if (!options.length && original) options = [original]

  const ext = info.extmetadata || {}
  const license = stripHtml(ext.LicenseShortName?.value || item.expectedLicense)
  const artist = stripHtml(ext.Artist?.value || item.attribution)
  const descriptionUrl = info.descriptionurl || `https://commons.wikimedia.org/wiki/${encodeURIComponent(item.fileTitle.replace(/ /g, '_'))}`

  return {
    fileTitle: item.fileTitle,
    thumbUrl: info.thumburl || info.url,
    descriptionUrl,
    license,
    artist,
    originalBytes: Number(info.size || 0) || null,
    options,
  }
}

export function formatBytes(bytes) {
  if (!bytes || !Number.isFinite(bytes)) return ''
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let i = 0
  while (value >= 1024 && i < units.length - 1) { value /= 1024; i += 1 }
  return `${value >= 100 || i === 0 ? Math.round(value) : value.toFixed(1)} ${units[i]}`
}

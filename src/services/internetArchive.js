const SEARCH_URL = 'https://archive.org/advancedsearch.php'
const METADATA_URL = 'https://archive.org/metadata'
const DOWNLOAD_URL = 'https://archive.org/download'

function asText(value) {
  if (Array.isArray(value)) return value.filter(Boolean).join(' · ')
  return String(value || '')
}

function cleanSearchTerm(value) {
  return String(value || '')
    .replace(/[(){}\[\]"'\\:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function isClearlyOpen(metadata = {}) {
  const license = `${asText(metadata.licenseurl)} ${asText(metadata.rights)} ${asText(metadata.license)}`.toLowerCase()
  return (
    license.includes('creativecommons.org') ||
    license.includes('creative commons') ||
    license.includes('public domain') ||
    license.includes('publicdomain') ||
    /\bcc\s*(by|0|by-sa|by-nc|by-nd)/i.test(license)
  )
}

function friendlyLicense(metadata = {}) {
  const licenseUrl = asText(metadata.licenseurl)
  const rights = asText(metadata.rights || metadata.license)
  if (/publicdomain|public domain/i.test(`${licenseUrl} ${rights}`)) return 'Domínio público'
  const cc = `${licenseUrl} ${rights}`.match(/CC\s*(BY(?:-[A-Z]+)*|0)(?:\s*\d(?:\.\d)?)?/i)
  if (cc) return cc[0].toUpperCase().replace(/\s+/g, ' ')
  if (/creativecommons\.org/i.test(licenseUrl)) {
    const match = licenseUrl.match(/licenses\/([^/]+)\/([\d.]+)/i)
    if (match) return `CC ${match[1].toUpperCase()} ${match[2]}`
    if (/publicdomain\/zero/i.test(licenseUrl)) return 'CC0'
  }
  return rights || 'Licença aberta informada pela fonte'
}

function descriptionText(value) {
  const text = asText(value).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  return text.length > 260 ? `${text.slice(0, 257)}…` : text
}

function archiveFileUrl(identifier, name) {
  const id = encodeURIComponent(identifier)
  const encodedName = String(name).split('/').map(encodeURIComponent).join('/')
  return `${DOWNLOAD_URL}/${id}/${encodedName}`
}

function heightFromFile(file) {
  const direct = Number(file?.height || 0)
  if (direct) return direct
  const name = String(file?.name || '')
  const match = name.match(/(?:^|[^0-9])(2160|1440|1080|720|576|540|480|360|240)p?(?:[^0-9]|$)/i)
  return match ? Number(match[1]) : 0
}

function videoOptions(identifier, files = []) {
  const accepted = files.filter((file) => {
    const name = String(file?.name || '').toLowerCase()
    const format = String(file?.format || '').toLowerCase()
    if (!/\.(mp4|m4v|webm|ogv)(?:$|\?)/i.test(name)) return false
    if (/(sample|thumb|preview|trailer)/i.test(name)) return false
    return /(mpeg4|h\.264|webm|ogg|matroska|quicktime|video)/i.test(format) || /\.(mp4|m4v|webm|ogv)$/i.test(name)
  })

  const mapped = accepted.map((file) => {
    const height = heightFromFile(file)
    const ext = String(file.name).split('.').pop()?.toLowerCase()
    const mime = ext === 'mp4' || ext === 'm4v' ? 'video/mp4' : ext === 'ogv' ? 'video/ogg' : 'video/webm'
    const size = Number(file.size || 0)
    const quality = height ? `${height}p` : `${String(file.format || ext || 'vídeo').replace(/MPEG4/i, 'MP4')}${size ? ` · ${formatBytes(size)}` : ''}`
    return {
      quality,
      height,
      url: archiveFileUrl(identifier, file.name),
      mime,
      estimatedBytes: size || null,
      source: file.source,
      fileName: file.name,
    }
  })

  mapped.sort((a, b) => {
    if (a.height && b.height) return b.height - a.height
    if (a.height) return -1
    if (b.height) return 1
    return Number(b.estimatedBytes || 0) - Number(a.estimatedBytes || 0)
  })

  const unique = []
  const seen = new Set()
  for (const option of mapped) {
    const key = `${option.height || option.quality}-${option.mime}`
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(option)
    if (unique.length >= 8) break
  }
  return unique
}

function findTorrent(identifier, files = []) {
  const torrent = files.find((file) => /\.torrent$/i.test(String(file?.name || '')))
  if (!torrent) return null
  return archiveFileUrl(identifier, torrent.name)
}

export function formatBytes(bytes) {
  const value = Number(bytes || 0)
  if (!value) return ''
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const index = Math.min(units.length - 1, Math.floor(Math.log(value) / Math.log(1024)))
  return `${(value / (1024 ** index)).toFixed(index > 1 ? 1 : 0)} ${units[index]}`
}

export async function searchOpenMovies(term = '', page = 1) {
  const clean = cleanSearchTerm(term)
  const queryParts = ['mediatype:movies', 'collection:opensource_movies', '(licenseurl:* OR rights:*)']
  if (clean) {
    const words = clean.split(' ').filter(Boolean).slice(0, 6)
    queryParts.push(words.map((word) => `(title:${word} OR description:${word} OR subject:${word})`).join(' AND '))
  }

  const params = new URLSearchParams()
  params.set('q', queryParts.join(' AND '))
  ;['identifier', 'title', 'description', 'year', 'licenseurl', 'rights', 'creator', 'downloads'].forEach((field) => params.append('fl[]', field))
  params.append('sort[]', 'downloads desc')
  params.set('rows', '50')
  params.set('page', String(page))
  params.set('output', 'json')

  const response = await fetch(`${SEARCH_URL}?${params.toString()}`)
  if (!response.ok) throw new Error(`Internet Archive respondeu ${response.status}`)
  const data = await response.json()
  const docs = data?.response?.docs || []
  return docs
    .filter(isClearlyOpen)
    .slice(0, 18)
    .map((doc) => ({
      id: `ia:${doc.identifier}`,
      identifier: doc.identifier,
      title: asText(doc.title) || doc.identifier,
      year: asText(doc.year),
      description: descriptionText(doc.description) || 'Item de vídeo disponibilizado no Internet Archive com licença aberta informada nos metadados.',
      creator: asText(doc.creator),
      downloads: Number(doc.downloads || 0),
      license: friendlyLicense(doc),
      rights: asText(doc.rights),
      thumbUrl: `https://archive.org/services/img/${encodeURIComponent(doc.identifier)}`,
      sourceUrl: `https://archive.org/details/${encodeURIComponent(doc.identifier)}`,
    }))
}

export async function getArchiveMovie(item) {
  const identifier = item?.identifier || String(item?.id || '').replace(/^ia:/, '')
  if (!identifier) throw new Error('Identificador do Internet Archive ausente.')
  const response = await fetch(`${METADATA_URL}/${encodeURIComponent(identifier)}`)
  if (!response.ok) throw new Error(`Não foi possível consultar os arquivos (${response.status}).`)
  const data = await response.json()
  const metadata = data?.metadata || {}
  if (!isClearlyOpen(metadata)) {
    throw new Error('Este item não possui licença aberta/domínio público suficientemente clara nos metadados para habilitar o download automático.')
  }
  const options = videoOptions(identifier, data?.files || [])
  if (!options.length) throw new Error('Nenhum MP4/WebM compatível foi encontrado neste item.')
  return {
    ...item,
    title: asText(metadata.title) || item.title,
    description: descriptionText(metadata.description) || item.description,
    creator: asText(metadata.creator) || item.creator,
    license: friendlyLicense(metadata),
    rights: asText(metadata.rights),
    sourceUrl: `https://archive.org/details/${encodeURIComponent(identifier)}`,
    thumbUrl: item.thumbUrl || `https://archive.org/services/img/${encodeURIComponent(identifier)}`,
    options,
    torrentUrl: findTorrent(identifier, data?.files || []),
  }
}

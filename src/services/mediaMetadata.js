import { TMDB_IMAGE, hasTmdbToken } from '../config'
import { tmdb } from '../api/tmdb'

const NOISE = new Set([
  '2160p','1080p','720p','576p','480p','360p','4k','uhd','hdr','hdr10','dv','dolby','vision',
  'bluray','blu-ray','bdrip','brrip','webrip','web-rip','webdl','web-dl','hdtv','hdrip','dvdrip','remux',
  'x264','x265','h264','h265','hevc','av1','aac','ac3','eac3','ddp5','ddp','dts','atmos','10bit','8bit',
  'proper','repack','extended','uncut','remastered','imax','multi','dual','audio','dublado','legendado','legendas',
  'ptbr','pt-br','portuguese','english','eng','por','br','nf','amzn','dsnp','hmax','atvp','yts','rarbg'
])

function safeDecode(value) {
  try { return decodeURIComponent(value) } catch { return value }
}

function getRawName(input) {
  const value = String(input || '').trim()
  if (!value) return ''
  if (/^magnet:/i.test(value)) {
    try {
      const params = new URLSearchParams(value.slice(value.indexOf('?') + 1))
      return safeDecode(params.get('dn') || '')
    } catch { return '' }
  }
  try {
    const url = new URL(value)
    const last = url.pathname.split('/').filter(Boolean).pop() || ''
    return safeDecode(last || url.hostname)
  } catch {
    return safeDecode(value.split('/').pop() || value)
  }
}

function cleanToken(token) {
  return token.replace(/^\[|\]$/g, '').replace(/^\(|\)$/g, '').trim()
}

export function parseMediaName(input) {
  const raw = getRawName(input)
  const withoutExt = raw.replace(/\.(mp4|mkv|webm|m4v|avi|mov|ogv|torrent)$/i, '')
  const seasonEpisode = withoutExt.match(/(?:^|[. _-])S(\d{1,2})E(\d{1,3})(?:[. _-]|$)/i)
    || withoutExt.match(/(?:^|[. _-])(\d{1,2})x(\d{1,3})(?:[. _-]|$)/i)
  const yearMatch = withoutExt.match(/(?:^|[. _\-(])(19\d{2}|20\d{2})(?=$|[. _\-)])/)
  const season = seasonEpisode ? Number(seasonEpisode[1]) : null
  const episode = seasonEpisode ? Number(seasonEpisode[2]) : null
  const year = yearMatch ? Number(yearMatch[1]) : null

  let working = withoutExt
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\([^)]*(?:1080|720|2160|x264|x265|webrip|web-dl|bluray)[^)]*\)/ig, ' ')
    .replace(/S\d{1,2}E\d{1,3}/ig, ' ')
    .replace(/\b\d{1,2}x\d{1,3}\b/ig, ' ')
    .replace(/\b(19\d{2}|20\d{2})\b/g, ' ')
    .replace(/[._+]+/g, ' ')
    .replace(/-/g, ' ')

  const tokens = working.split(/\s+/).map(cleanToken).filter(Boolean)
  const kept = []
  for (const token of tokens) {
    const normalized = token.toLowerCase().replace(/[^a-z0-9-]/g, '')
    if (!normalized) continue
    if (NOISE.has(normalized)) continue
    if (/^(?:2160|1080|720|576|480|360)p$/i.test(normalized)) continue
    if (/^(?:x|h)26[45]$/i.test(normalized)) continue
    if (/^[a-f0-9]{8,}$/i.test(normalized)) continue
    kept.push(token)
  }

  let title = kept.join(' ').replace(/\s+/g, ' ').trim()
  // Release groups often sit after the last dash. If cleaning left a very long tail, keep a sane title.
  title = title.replace(/\s+(?:www\s+)?(?:com|net|org)$/i, '').trim()
  return { raw, title, year, season, episode, mediaTypeHint: seasonEpisode ? 'tv' : null }
}

function normalizedTitle(value) {
  return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
}

function scoreCandidate(candidate, parsed, preferredType) {
  const candidateTitle = candidate.title || candidate.name || ''
  const candidateYear = Number((candidate.release_date || candidate.first_air_date || '').slice(0, 4)) || null
  const a = normalizedTitle(candidateTitle)
  const b = normalizedTitle(parsed.title)
  let score = 0
  if (a === b) score += 100
  else if (a.includes(b) || b.includes(a)) score += 55
  else {
    const aWords = new Set(a.split(' ').filter(Boolean))
    const bWords = b.split(' ').filter(Boolean)
    if (bWords.length) score += Math.round((bWords.filter((w) => aWords.has(w)).length / bWords.length) * 45)
  }
  if (parsed.year && candidateYear) score += parsed.year === candidateYear ? 35 : Math.max(0, 12 - Math.abs(parsed.year - candidateYear) * 4)
  const type = candidate.media_type || (candidate.title ? 'movie' : 'tv')
  if (preferredType && type === preferredType) score += 18
  if (candidate.poster_path) score += 4
  return score
}

export async function searchTmdbForSource(input, manualQuery = '') {
  if (!hasTmdbToken()) throw new Error('Cadastre o token do TMDB primeiro.')
  const parsed = parseMediaName(input)
  const query = String(manualQuery || parsed.title || '').trim()
  if (!query) throw new Error('Não foi possível identificar um título nesta URL. Digite o título para pesquisar.')
  const response = await tmdb.search(query)
  const preferredType = parsed.mediaTypeHint
  const candidates = (response.results || [])
    .filter((item) => ['movie', 'tv'].includes(item.media_type) && (item.title || item.name))
    .map((item) => ({ ...item, _score: scoreCandidate(item, { ...parsed, title: query }, preferredType) }))
    .sort((a, b) => b._score - a._score)
    .slice(0, 6)
    .map((item) => ({
      tmdbId: item.id,
      mediaType: item.media_type,
      title: item.title || item.name,
      originalTitle: item.original_title || item.original_name || '',
      year: (item.release_date || item.first_air_date || '').slice(0, 4),
      overview: item.overview || '',
      poster: item.poster_path ? `${TMDB_IMAGE}/w500${item.poster_path}` : '',
      backdrop: item.backdrop_path ? `${TMDB_IMAGE}/w780${item.backdrop_path}` : '',
      score: item._score,
      season: parsed.season,
      episode: parsed.episode,
      query,
    }))
  return { parsed, query, candidates }
}

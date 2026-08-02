import { EMBED_BASE_URL } from '../config'

export function embedMovie(id) {
  return `${EMBED_BASE_URL}/filme/${encodeURIComponent(id)}`
}

export function embedSeries(id) {
  return `${EMBED_BASE_URL}/serie/${encodeURIComponent(id)}`
}

export function embedEpisode(id, season, episode) {
  return `${EMBED_BASE_URL}/serie/${encodeURIComponent(id)}/${Number(season)}/${Number(episode)}`
}

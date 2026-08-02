import { TMDB_LANGUAGE, TMDB_REGION, getTmdbToken } from '../config'

const API = 'https://api.themoviedb.org/3'

function token() {
  return getTmdbToken()
}

async function request(path, params = {}) {
  const bearer = token()
  if (!bearer) {
    throw new Error('TMDB_TOKEN_MISSING')
  }

  const url = new URL(`${API}${path}`)
  const query = {
    language: TMDB_LANGUAGE,
    ...params,
  }

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value))
    }
  })

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${bearer}`,
      accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`TMDB_${response.status}`)
  }

  return response.json()
}

export const tmdb = {
  trending: () => request('/trending/all/day'),
  popularMovies: () => request('/movie/popular', { region: TMDB_REGION }),
  nowPlaying: () => request('/movie/now_playing', { region: TMDB_REGION }),
  popularTv: () => request('/tv/popular'),
  topRatedMovies: () => request('/movie/top_rated', { region: TMDB_REGION }),
  search: (query) => request('/search/multi', { query, include_adult: false }),
  movieDetails: (id) => request(`/movie/${id}`, { append_to_response: 'credits,videos,recommendations' }),
  tvDetails: (id) => request(`/tv/${id}`, { append_to_response: 'credits,videos,recommendations' }),
  season: (tvId, seasonNumber) => request(`/tv/${tvId}/season/${seasonNumber}`),
}

export function normalizeMedia(item) {
  const type = item.media_type || (item.title ? 'movie' : 'tv')
  return {
    ...item,
    media_type: type,
    displayTitle: item.title || item.name || 'Sem título',
    displayDate: item.release_date || item.first_air_date || '',
  }
}

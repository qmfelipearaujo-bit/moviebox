export const APP_NAME = 'MovieBox Private'
export const TMDB_LANGUAGE = import.meta.env.VITE_TMDB_LANGUAGE || 'pt-BR'
export const TMDB_REGION = import.meta.env.VITE_TMDB_REGION || 'BR'
export const EMBED_BASE_URL = (import.meta.env.VITE_EMBED_BASE_URL || 'https://cdn-embed.com').replace(/\/$/, '')
export const TMDB_IMAGE = 'https://image.tmdb.org/t/p'

const TOKEN_KEY = 'moviebox_tmdb_token'

export function getTmdbToken() {
  try {
    const saved = localStorage.getItem(TOKEN_KEY)
    if (saved && saved.trim()) return saved.trim()
  } catch (_) {}
  const builtIn = import.meta.env.VITE_TMDB_BEARER_TOKEN
  return builtIn && builtIn !== 'COLE_AQUI_SEU_TOKEN_TMDB' ? builtIn.trim() : ''
}

export function setTmdbToken(value) {
  localStorage.setItem(TOKEN_KEY, String(value || '').trim())
}

export function clearTmdbToken() {
  localStorage.removeItem(TOKEN_KEY)
}

export const hasTmdbToken = () => Boolean(getTmdbToken())

import { getLibrarySnapshot, mergeLibrarySnapshot, replaceFavorites, replaceHistory } from './storage'

const CONFIG_KEY = 'moviebox:supabase-config'
const SESSION_KEY = 'moviebox:supabase-session'
let suppressPush = false
let pushTimer = null

function read(key, fallback = null) {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback } catch { return fallback }
}

function write(key, value) {
  if (value == null) localStorage.removeItem(key)
  else localStorage.setItem(key, JSON.stringify(value))
  window.dispatchEvent(new CustomEvent('moviebox-account-changed'))
}

export function getCloudConfig() {
  const stored = read(CONFIG_KEY, null)
  if (stored?.url || stored?.key) return stored
  return { url: import.meta.env.VITE_SUPABASE_URL || '', key: import.meta.env.VITE_SUPABASE_ANON_KEY || '' }
}
export function setCloudConfig(config) {
  const clean = { url: String(config?.url || '').trim().replace(/\/$/, ''), key: String(config?.key || '').trim() }
  write(CONFIG_KEY, clean)
  return clean
}
export function clearCloudConfig() { write(CONFIG_KEY, { url: '', key: '' }); write(SESSION_KEY, null) }
export function getCloudSession() { return read(SESSION_KEY, null) }

function configured() {
  const c = getCloudConfig()
  return /^https:\/\//i.test(c.url) && c.key.length > 20
}

function baseHeaders(accessToken) {
  const { key } = getCloudConfig()
  return {
    apikey: key,
    Authorization: `Bearer ${accessToken || key}`,
    'Content-Type': 'application/json',
  }
}

async function authFetch(path, options = {}) {
  const { url } = getCloudConfig()
  if (!configured()) throw new Error('SUPABASE_NOT_CONFIGURED')
  const response = await fetch(`${url}/auth/v1${path}`, {
    ...options,
    headers: { ...baseHeaders(), ...(options.headers || {}) },
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data?.msg || data?.error_description || data?.message || `AUTH_${response.status}`)
  return data
}

function saveAuthResponse(data) {
  if (data?.access_token) {
    const session = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: Date.now() + Number(data.expires_in || 3600) * 1000,
      user: data.user,
    }
    write(SESSION_KEY, session)
    return session
  }
  return null
}

export async function signUp(email, password) {
  const data = await authFetch('/signup', { method: 'POST', body: JSON.stringify({ email, password }) })
  const session = saveAuthResponse(data)
  return { session, user: data.user, needsConfirmation: !session }
}

export async function signIn(email, password) {
  const data = await authFetch('/token?grant_type=password', { method: 'POST', body: JSON.stringify({ email, password }) })
  const session = saveAuthResponse(data)
  if (session) await pullCloudLibrary(true)
  return session
}

export function signOut() {
  write(SESSION_KEY, null)
}

async function validSession() {
  let session = getCloudSession()
  if (!session?.access_token) return null
  if (Number(session.expires_at || 0) - Date.now() > 60_000) return session
  if (!session.refresh_token) return session
  try {
    const data = await authFetch('/token?grant_type=refresh_token', { method: 'POST', body: JSON.stringify({ refresh_token: session.refresh_token }) })
    session = saveAuthResponse(data) || session
  } catch {}
  return session
}

export async function pullCloudLibrary(merge = false) {
  const session = await validSession()
  if (!session?.user?.id) return null
  const { url } = getCloudConfig()
  const response = await fetch(`${url}/rest/v1/moviebox_library?user_id=eq.${encodeURIComponent(session.user.id)}&select=favorites,history&limit=1`, { headers: baseHeaders(session.access_token) })
  if (!response.ok) throw new Error(`CLOUD_PULL_${response.status}`)
  const rows = await response.json()
  const row = rows?.[0]
  if (!row) {
    await pushCloudLibrary()
    return getLibrarySnapshot()
  }
  suppressPush = true
  try {
    if (merge) mergeLibrarySnapshot({ favorites: row.favorites || [], history: row.history || [] })
    else {
      replaceFavorites(row.favorites || [])
      replaceHistory(row.history || [])
    }
  } finally {
    setTimeout(() => { suppressPush = false }, 50)
  }
  if (merge) await pushCloudLibrary()
  return getLibrarySnapshot()
}

export async function pushCloudLibrary() {
  const session = await validSession()
  if (!session?.user?.id) return false
  const { url } = getCloudConfig()
  const snapshot = getLibrarySnapshot()
  const response = await fetch(`${url}/rest/v1/moviebox_library?on_conflict=user_id`, {
    method: 'POST',
    headers: { ...baseHeaders(session.access_token), Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ user_id: session.user.id, favorites: snapshot.favorites, history: snapshot.history, updated_at: new Date().toISOString() }),
  })
  if (!response.ok) throw new Error(`CLOUD_PUSH_${response.status}`)
  return true
}

export function startCloudAutoSync() {
  const handler = () => {
    if (suppressPush || !getCloudSession()?.access_token) return
    clearTimeout(pushTimer)
    pushTimer = setTimeout(() => pushCloudLibrary().catch(() => {}), 700)
  }
  window.addEventListener('moviebox-storage-changed', handler)
  return () => window.removeEventListener('moviebox-storage-changed', handler)
}

export function isCloudConfigured() { return configured() }

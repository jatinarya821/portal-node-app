/**
 * auth-client.js
 * All authentication now goes through the real server API.
 * Session is maintained server-side via cookies (connect-mongo).
 */

const AUTH_USER_KEY = 'portal-auth-user'

// ─── Role → dashboard path ────────────────────────────────────────────────
const ROLE_HOME = {
  admin: '/dashboard',
  judge: '/dashboard',
  clerk: '/dashboard',
  advocate: '/citizen/dashboard',
  citizen: '/citizen/dashboard',
}

// ─── Local cache helpers (for fast UI reads only — server is source of truth) ──
function cacheUser(user) {
  try {
    sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(user))
  } catch { /* ignore */ }
}

function clearCache() {
  try { sessionStorage.removeItem(AUTH_USER_KEY) } catch { /* ignore */ }
}

function readCache() {
  try {
    const raw = sessionStorage.getItem(AUTH_USER_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch { return null }
}

function safeNextPath(pathname) {
  if (!pathname || typeof pathname !== 'string') return null
  if (!pathname.startsWith('/')) return null
  if (pathname.startsWith('//')) return null
  if (pathname.startsWith('/login') || pathname.startsWith('/register')) return null
  return pathname
}

function getRequestedNextPath() {
  const params = new URLSearchParams(window.location.search)
  return safeNextPath(params.get('next'))
}

// ─── Public API ───────────────────────────────────────────────────────────

/** Returns cached user object (from sessionStorage). May be null. */
export function getCurrentUser() {
  return readCache()
}

/** True if there is a cached session user. */
export function isAuthenticated() {
  return Boolean(readCache())
}

/**
 * Sign in via the real API. Throws on failure.
 * @returns {Promise<object>} resolved user object
 */
export async function signIn({ email, password }) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Login failed')
  cacheUser(data.user)
  return data.user
}

/**
 * Register a new citizen or advocate account.
 * @returns {Promise<object>} resolved user object
 */
export async function register({ fullName, email, password, role = 'citizen', barNumber = '' }) {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ fullName, email, password, role, barNumber }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Registration failed')
  cacheUser(data.user)
  return data.user
}

/**
 * Fetch current session from server — the real source of truth.
 * Use this on page load to verify session is still valid.
 * @returns {Promise<object|null>}
 */
export async function fetchCurrentUser() {
  try {
    const res = await fetch('/api/auth/me', { credentials: 'include' })
    if (!res.ok) { clearCache(); return null }
    const data = await res.json()
    cacheUser(data.user)
    return data.user
  } catch { return null }
}

/** Sign out via server, then clear cache and redirect. */
export async function signOut() {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    })
  } catch { /* ignore network errors on logout */ }
  clearCache()
}

/** Returns the correct home URL for a given role string. */
export function roleHome(role) {
  return ROLE_HOME[role] || '/dashboard'
}

/** Returns the post-login destination (from ?next= param or role home). */
export function getPostLoginDestination(user) {
  return getRequestedNextPath() || roleHome(user.role)
}

/**
 * If already authenticated, redirect to dashboard. Returns true if redirected.
 * Call this on the login/register page.
 */
export async function redirectIfAuthenticated() {
  const user = await fetchCurrentUser()
  if (!user) return false
  window.location.replace(roleHome(user.role))
  return true
}

/**
 * Guard: if not authenticated, redirect to login.
 * Returns the user object if authenticated, null otherwise.
 */
export async function requireAuth() {
  const user = await fetchCurrentUser()
  if (user) return user
  const next = `${window.location.pathname}${window.location.search}`
  window.location.replace(`/login?next=${encodeURIComponent(next)}`)
  return null
}

/** @deprecated Use signIn() which calls the real API */
export function listDemoUsers() {
  return []
}

const AUTH_USER_KEY = 'portal-auth-user'

const DEMO_USERS = [
  {
    id: 'admin-001',
    fullName: 'Jatin Arya',
    email: 'admin@court.local',
    password: 'admin123',
    role: 'Court Administrator',
  },
  {
    id: 'judge-001',
    fullName: 'Justice R. Sharma',
    email: 'judge@court.local',
    password: 'judge123',
    role: 'Judge',
  },
  {
    id: 'clerk-001',
    fullName: 'Neha Verma',
    email: 'clerk@court.local',
    password: 'clerk123',
    role: 'Registry Clerk',
  },
  {
    id: 'lawyer-001',
    fullName: 'Rahul Mehta',
    email: 'lawyer@court.local',
    password: 'lawyer123',
    role: 'Advocate',
  },
]

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase()
}

function safeNextPath(pathname) {
  if (!pathname || typeof pathname !== 'string') return null
  if (!pathname.startsWith('/')) return null
  if (pathname.startsWith('//')) return null
  if (pathname.startsWith('/login')) return '/dashboard'
  return pathname
}

function readStoredUser() {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    return parsed
  } catch {
    return null
  }
}

function storeUser(user) {
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user))
}

function getRequestedNextPath() {
  const params = new URLSearchParams(window.location.search)
  const next = params.get('next')
  return safeNextPath(next)
}

export function listDemoUsers() {
  return DEMO_USERS.map((user) => ({ ...user }))
}

export function getCurrentUser() {
  return readStoredUser()
}

export function isAuthenticated() {
  return Boolean(readStoredUser())
}

export function signIn({ email, password }) {
  const normalizedEmail = normalizeEmail(email)
  const credential = String(password || '')

  const user = DEMO_USERS.find((item) => normalizeEmail(item.email) === normalizedEmail)
  if (!user || user.password !== credential) {
    throw new Error('Invalid email or password')
  }

  const sessionUser = {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    lastLogin: new Date().toISOString(),
  }

  storeUser(sessionUser)
  return sessionUser
}

export function signOut() {
  localStorage.removeItem(AUTH_USER_KEY)
}

export function getPostLoginDestination(defaultPath = '/dashboard') {
  return getRequestedNextPath() || defaultPath
}

export function redirectIfAuthenticated(defaultPath = '/dashboard') {
  const current = readStoredUser()
  if (!current) return false
  const destination = getPostLoginDestination(defaultPath)
  window.location.replace(destination)
  return true
}

export function requireAuth() {
  const current = readStoredUser()
  if (current) return current

  const next = `${window.location.pathname}${window.location.search}`
  window.location.replace(`/login?next=${encodeURIComponent(next)}`)
  return null
}

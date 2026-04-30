const User = require('../models/User')

/**
 * requireAuth — blocks unauthenticated requests.
 * On API calls returns 401 JSON. On page requests redirects to /login.
 */
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) return next()
  const isApi = req.path.startsWith('/api') || req.xhr
    || (req.headers.accept || '').includes('application/json')
  if (isApi) return res.status(401).json({ message: 'Authentication required' })
  return res.redirect(`/login?next=${encodeURIComponent(req.originalUrl)}`)
}

/**
 * requireRole — ensures the logged-in user has one of the allowed roles.
 * Usage: requireRole('admin'), requireRole('clerk', 'admin')
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: 'Authentication required' })
    }
    if (!allowedRoles.includes(req.session.userRole)) {
      return res.status(403).json({
        message: `Access denied. Required role: ${allowedRoles.join(' or ')}`,
      })
    }
    next()
  }
}

/**
 * loadUser — attaches the full User document to req.user on each request.
 * Must be mounted AFTER session middleware.
 */
async function loadUser(req, res, next) {
  if (!req.session || !req.session.userId) return next()
  try {
    const user = await User.findById(req.session.userId).select('-passwordHash')
    req.user = user || null
  } catch {
    req.user = null
  }
  next()
}

module.exports = { requireAuth, requireRole, loadUser }

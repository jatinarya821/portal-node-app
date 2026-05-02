const express = require('express')
const path = require('path')
const cors = require('cors')
const dotenv = require('dotenv')
const session = require('express-session')
const { MongoStore } = require('connect-mongo')
const morgan = require('morgan')

const connectDB = require('./server/config/db')
const apiRoutes = require('./server/routes/apiRoutes')
const authRoutes = require('./server/routes/authRoutes')
const { requireAuth, requireRole, loadUser } = require('./server/middleware/auth')

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000
const SESSION_SECRET = process.env.SESSION_SECRET || 'portal-dev-secret-change-in-production'
const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DATABASE_URL || ''
const pagesDir = path.join(__dirname, 'pages')

let hasLoggedDbConnection = false

// ─── DB helper ────────────────────────────────────────────────────────────
async function ensureDbConnected(req, res, next) {
  try {
    const connection = await connectDB(mongoUri)
    if (!hasLoggedDbConnection) {
      const { host, name } = connection.connection
      console.log(`MongoDB connected: ${host}/${name}`)
      hasLoggedDbConnection = true
    }
    next()
  } catch (error) {
    const reason = error && error.message ? error.message : 'Unknown database error'
    console.error('MongoDB connection failed:', reason)
    return res.status(503).json({ message: `Database unavailable: ${reason}` })
  }
}

// ─── Trust proxy (required for Vercel / Render / any reverse proxy) ──────
app.set('trust proxy', 1)

// ─── Core Middleware ──────────────────────────────────────────────────────
app.use(morgan('dev'))
app.use(cors({ origin: true, credentials: true }))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// ─── Session ──────────────────────────────────────────────────────────────
app.use(
  session({
    name: 'portal.sid',
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 8 * 60 * 60 * 1000, // 8 hours
    },
    store: MongoStore.create({
      mongoUrl: mongoUri,
      collectionName: 'sessions',
      ttl: 8 * 60 * 60, // 8 hours
    }),
  })
)

// ─── Static assets ────────────────────────────────────────────────────────
app.use('/public', express.static(path.join(__dirname, 'public')))
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// ─── Auth API routes (no auth required) ──────────────────────────────────
app.use('/api/auth', ensureDbConnected, authRoutes)

// ─── Protected API routes ─────────────────────────────────────────────────
app.use('/api', ensureDbConnected, requireAuth, apiRoutes)

// ─── Public pages ─────────────────────────────────────────────────────────
app.get('/', (req, res) => res.redirect('/login'))
app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }))

app.get('/login', (req, res) => {
  if (req.session && req.session.userId) {
    return res.redirect(roleHomePath(req.session.userRole))
  }
  res.sendFile(path.join(pagesDir, 'login.html'))
})

app.get('/register', (req, res) => {
  if (req.session && req.session.userId) {
    return res.redirect(roleHomePath(req.session.userRole))
  }
  res.sendFile(path.join(pagesDir, 'register.html'))
})

// ─── Protected pages ──────────────────────────────────────────────────────
// Staff/court pages — clerk, judge, admin only
const staffOnly = requireRole('clerk', 'judge', 'admin')

app.get('/dashboard', requireAuth, (req, res) => {
  res.sendFile(path.join(pagesDir, 'dashboard.html'))
})
app.get('/cases', requireAuth, staffOnly, (req, res) => {
  res.sendFile(path.join(pagesDir, 'cases.html'))
})
app.get('/hearings', requireAuth, staffOnly, (req, res) => {
  res.sendFile(path.join(pagesDir, 'hearings.html'))
})
app.get('/documents', requireAuth, staffOnly, (req, res) => {
  res.sendFile(path.join(pagesDir, 'documents.html'))
})
app.get('/case-detail', requireAuth, staffOnly, (req, res) => {
  res.sendFile(path.join(pagesDir, 'case-detail.html'))
})

// Citizen portal
app.get('/citizen/dashboard', requireAuth, requireRole('citizen', 'advocate', 'admin'), (req, res) => {
  res.sendFile(path.join(pagesDir, 'citizen-dashboard.html'))
})
app.get('/citizen/submit', requireAuth, requireRole('citizen', 'advocate', 'admin'), (req, res) => {
  res.sendFile(path.join(pagesDir, 'citizen-submit.html'))
})
app.get('/citizen/my-cases', requireAuth, requireRole('citizen', 'advocate', 'admin'), (req, res) => {
  res.sendFile(path.join(pagesDir, 'citizen-my-cases.html'))
})
app.get('/citizen/documents', requireAuth, requireRole('advocate', 'admin'), (req, res) => {
  res.sendFile(path.join(pagesDir, 'citizen-documents.html'))
})

// Admin portal
app.get('/admin/users', requireAuth, requireRole('admin'), (req, res) => {
  res.sendFile(path.join(pagesDir, 'admin-users.html'))
})

// Public case tracking (no login required)
app.get('/track', (req, res) => res.sendFile(path.join(pagesDir, 'track.html')))

// ─── Error handler ────────────────────────────────────────────────────────
app.use((error, req, res, next) => {
  console.error(error)
  res.status(500).json({ message: error.message || 'Internal server error' })
})

// ─── Role → home page helper ──────────────────────────────────────────────
function roleHomePath(role) {
  const map = {
    admin: '/dashboard',
    judge: '/dashboard',
    clerk: '/dashboard',
    advocate: '/citizen/dashboard',
    citizen: '/citizen/dashboard',
  }
  return map[role] || '/dashboard'
}

// ─── Boot ─────────────────────────────────────────────────────────────────
if (require.main === module) {
  connectDB(mongoUri)
    .then((connection) => {
      const { host, name } = connection.connection
      console.log(`MongoDB connected: ${host}/${name}`)
      hasLoggedDbConnection = true
      app.listen(PORT, () => {
        console.log(`Portal app running at http://127.0.0.1:${PORT}`)
      })
    })
    .catch((error) => {
      console.error('MongoDB connection failed:', error.message)
      process.exit(1)
    })
}

module.exports = app

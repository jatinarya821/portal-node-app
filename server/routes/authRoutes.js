const express = require('express')
const rateLimit = require('express-rate-limit')
const { body, validationResult } = require('express-validator')
const User = require('../models/User')

const router = express.Router()

// Strict rate limit on login: 10 attempts per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Too many login attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
})

// Gentle rate limit on registration
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: { message: 'Too many registration attempts. Please try again later.' },
})

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

// ─── POST /api/auth/login ──────────────────────────────────────────────────
router.post(
  '/login',
  loginLimiter,
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  wrap(async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg })
    }

    const { email, password } = req.body
    const user = await User.findOne({ email })

    // Case 1: User not found in active users — check if they were deleted/archived
    if (!user) {
      const DeletedUser = require('../models/DeletedUser')
      const archived = await DeletedUser.findOne({ email })
      if (archived) {
        return res.status(403).json({
          message: 'Your account has been removed by an administrator. Please contact the court registry for assistance.',
          reason: 'account_deleted',
        })
      }
      return res.status(401).json({ message: 'Invalid email or password' })
    }

    // Case 2: User exists but account is suspended
    if (!user.isActive) {
      return res.status(403).json({
        message: 'Your account has been suspended. Please contact the administrator to reactivate your access.',
        reason: 'account_suspended',
      })
    }

    // Case 3: Wrong password
    const valid = await user.verifyPassword(password)
    if (!valid) {
      return res.status(401).json({ message: 'Invalid email or password' })
    }

    // Update lastLogin
    user.lastLogin = new Date()
    await user.save()

    // Persist session
    req.session.userId = String(user._id)
    req.session.userRole = user.role
    req.session.userFullName = user.fullName

    res.json({ user: user.toPublic() })
  })
)

// ─── POST /api/auth/register ───────────────────────────────────────────────
// Citizens and advocates self-register. Clerks/Judges/Admins are created by admin.
router.post(
  '/register',
  registerLimiter,
  [
    body('fullName').trim().notEmpty().withMessage('Full name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),
    body('role')
      .optional()
      .isIn(['citizen', 'advocate'])
      .withMessage('Self-registration is only available for citizen or advocate roles'),
    body('barNumber').optional().trim(),
  ],
  wrap(async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg })
    }

    const { fullName, email, password, role = 'citizen', barNumber = '' } = req.body

    // ── Full name: must be letters and spaces only (no numbers or special chars) ──
    if (/\d/.test(fullName)) {
      return res.status(400).json({ message: 'Full name must not contain numbers' })
    }
    if (!/^[A-Za-z\s.]+$/.test(fullName)) {
      return res.status(400).json({ message: 'Full name must contain only letters, spaces, and dots' })
    }
    if (fullName.trim().length < 2) {
      return res.status(400).json({ message: 'Full name must be at least 2 characters' })
    }

    const existing = await User.findOne({ email })
    if (existing) {
      return res.status(409).json({ message: 'An account with this email already exists' })
    }

    const passwordHash = await User.hashPassword(password)
    const user = await User.create({
      fullName,
      email,
      passwordHash,
      role,
      barNumber,
    })

    // Auto-login after registration
    req.session.userId = String(user._id)
    req.session.userRole = user.role
    req.session.userFullName = user.fullName

    res.status(201).json({ user: user.toPublic() })
  })
)

// ─── POST /api/auth/logout ─────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ message: 'Logout failed' })
    res.clearCookie('portal.sid')
    res.json({ message: 'Logged out successfully' })
  })
})

// ─── GET /api/auth/me ──────────────────────────────────────────────────────
router.get(
  '/me',
  wrap(async (req, res) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' })
    }
    const user = await User.findById(req.session.userId).select('-passwordHash')
    if (!user) return res.status(401).json({ message: 'Session expired' })
    res.json({ user: user.toPublic() })
  })
)

module.exports = router

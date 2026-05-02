const express = require('express')
const multer = require('multer')
const mongoose = require('mongoose')
const { Readable } = require('stream')

const Case = require('../models/Case')
const Hearing = require('../models/Hearing')
const Document = require('../models/Document')

const router = express.Router()
const wrap = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)
const storage = multer.memoryStorage()

const upload = multer({ storage })

const pad3 = (n) => String(n).padStart(3, '0')
const MAX_CASES_PAGE_LIMIT = 100

function buildCaseSnapshotFields(item) {
  return {
    caseNumber: item.caseNumber || '',
    title: item.title || '',
    type: item.type || '',
    status: item.status || '',
    court: item.court || '',
    judge: item.judge || '',
    petitioner: item.petitioner || '',
    respondent: item.respondent || '',
    summary: item.summary || '',
  }
}

async function createRegistrationDocumentForCase(item) {
  return Document.create({
    caseId: item._id,
    docType: 'CaseRegistration',
    name: 'Case Registration Record',
    category: 'Registration',
    uploadedBy: 'System',
    fileUrl: `/case-detail?id=${item._id}`,
    uploadedOn: new Date(item.createdAt || Date.now()).toISOString().slice(0, 10),
    ...buildCaseSnapshotFields(item),
  })
}

function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed < 1) return fallback
  return parsed
}

async function generateCaseNumber() {
  const year = new Date().getFullYear()
  const count = await Case.countDocuments({
    createdAt: {
      $gte: new Date(`${year}-01-01T00:00:00.000Z`),
      $lte: new Date(`${year}-12-31T23:59:59.999Z`),
    },
  })
  return `C-${year}-${pad3(count + 1)}`
}

function getUploadsBucket() {
  if (!mongoose.connection || !mongoose.connection.db) {
    throw new Error('Database connection is not ready')
  }
  return new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' })
}

function uploadBufferToGridFS(file, metadata = {}) {
  return new Promise((resolve, reject) => {
    const safeName = `${Date.now()}-${String(file.originalname || 'upload').replace(/\s+/g, '_')}`
    const bucket = getUploadsBucket()
    const stream = bucket.openUploadStream(safeName, {
      contentType: file.mimetype || 'application/octet-stream',
      metadata,
    })

    stream.once('error', reject)
    stream.once('finish', () => {
      resolve({
        fileId: stream.id,
        filename: safeName,
      })
    })

    Readable.from(file.buffer).pipe(stream)
  })
}

router.get('/cases', wrap(async (req, res) => {
  const search = (req.query.search || '').trim()
  const status = (req.query.status || 'All').trim()
  const type = (req.query.type || 'All').trim()
  const priority = (req.query.priority || 'All').trim()
  const shouldPaginate = Object.prototype.hasOwnProperty.call(req.query, 'page')
    || Object.prototype.hasOwnProperty.call(req.query, 'limit')

  const sessionRole = req.session && req.session.userRole
  const sessionUserId = req.session && req.session.userId

  const query = {}

  // ── Role-based data scoping ──────────────────────────────────────────
  if (sessionRole === 'citizen') {
    // Citizens only see cases they submitted
    query.submittedBy = sessionUserId
  } else if (sessionRole === 'advocate') {
    // Advocates see cases they submitted OR where they are the assigned advocate
    query.$or = [
      { submittedBy: sessionUserId },
      { advocate: sessionUserId },
    ]
  } else if (sessionRole === 'judge') {
    // Only see cases assigned to them
    if (req.session.userFullName) {
      query.judge = req.session.userFullName
    }
  }
  // clerk and admin see all cases — no filter applied

  if (status !== 'All') query.status = status
  if (type !== 'All') query.type = type
  if (priority !== 'All') query.priority = priority
  if (search) {
    query.$or = [
      { caseNumber: { $regex: search, $options: 'i' } },
      { title: { $regex: search, $options: 'i' } },
      { status: { $regex: search, $options: 'i' } },
      { priority: { $regex: search, $options: 'i' } },
      { judge: { $regex: search, $options: 'i' } },
    ]
  }

  if (shouldPaginate) {
    const page = parsePositiveInteger(req.query.page, 1)
    const limit = Math.min(parsePositiveInteger(req.query.limit, 10), MAX_CASES_PAGE_LIMIT)
    const total = await Case.countDocuments(query)
    const totalPages = Math.max(1, Math.ceil(total / limit))
    const safePage = Math.min(page, totalPages)

    const items = await Case.find(query)
      .sort({ createdAt: -1 })
      .skip((safePage - 1) * limit)
      .limit(limit)

    return res.json({
      items,
      pagination: {
        page: safePage,
        limit,
        total,
        totalPages,
        hasPrevPage: safePage > 1,
        hasNextPage: safePage < totalPages,
      },
    })
  }

  const items = await Case.find(query).sort({ createdAt: -1 })
  res.json({ items })
}))

router.post('/cases', wrap(async (req, res) => {
  const { title, type, petitioner, respondent, summary, advocateEmail } = req.body
  let { status, priority, court, judge } = req.body
  if (!title || !type) {
    return res.status(400).json({ message: 'title and type are required' })
  }

  const role = req.session && req.session.userRole
  const userId = req.session && req.session.userId

  // ── Citizens/Advocates: strip admin-only fields ──────────────────────
  if (role === 'citizen' || role === 'advocate') {
    court = undefined
    judge = undefined
    status = undefined
  }

  // ── Advocate linking ──────────────────────────────────────────
  let advocateId = null
  let advocateName = ''

  if (advocateEmail && advocateEmail.trim()) {
    const advocateUser = await User.findOne({ email: advocateEmail.trim().toLowerCase() })
    if (!advocateUser) {
      return res.status(400).json({ message: `No registered user found with email: ${advocateEmail}` })
    }
    if (advocateUser.role !== 'advocate') {
      return res.status(400).json({ message: `${advocateEmail} is not registered as an advocate` })
    }
    if (String(advocateUser._id) === String(userId)) {
      return res.status(400).json({ message: 'You cannot assign yourself as the advocate' })
    }
    if (!advocateUser.isActive) {
      return res.status(400).json({ message: 'This advocate\'s account is currently suspended' })
    }
    advocateId = advocateUser._id
    advocateName = advocateUser.fullName
  }

  // If an advocate is filing, they are automatically the case advocate
  if (role === 'advocate' && !advocateId) {
    advocateId = userId
    advocateName = req.session.userFullName || ''
  }

  const caseNumber = await generateCaseNumber()
  const item = await Case.create({
    caseNumber,
    title,
    type,
    status: status || 'Filed',
    priority: priority || 'Medium',
    court: court || 'Courtroom 1',
    judge: judge || 'Not Assigned',
    petitioner: petitioner || '',
    respondent: respondent || '',
    summary: summary || '',
    submittedBy: userId || null,
    advocate: advocateId,
    advocateName,
  })

  await createRegistrationDocumentForCase(item)

  res.status(201).json({ item })
}))

router.get('/cases/:id', wrap(async (req, res) => {
  const item = await Case.findById(req.params.id)
  if (!item) return res.status(404).json({ message: 'Case not found' })
  res.json({ item })
}))

// ── Edit case (clerk/admin: all fields; citizen/advocate: only if Filed) ──
router.patch('/cases/:id', wrap(async (req, res) => {
  const role = req.session && req.session.userRole
  const userId = req.session && req.session.userId
  const item = await Case.findById(req.params.id)
  if (!item) return res.status(404).json({ message: 'Case not found' })

  // Citizens/advocates can only edit their own cases while still Filed
  if (role === 'citizen' || role === 'advocate') {
    if (String(item.submittedBy) !== String(userId)) {
      return res.status(403).json({ message: 'You can only edit your own cases' })
    }
    if (item.status !== 'Filed') {
      return res.status(403).json({ message: 'Case can only be edited while status is Filed' })
    }
    // Citizens can only update limited fields
    const { title, petitioner, respondent, summary } = req.body
    Object.assign(item, { title, petitioner, respondent, summary })
  } else if (role === 'clerk' || role === 'admin') {
    // Clerks/admins can update any field
    const { title, type, status, priority, court, judge, petitioner, respondent, summary } = req.body
    Object.assign(item, { title, type, status, priority, court, judge, petitioner, respondent, summary })
  } else {
    return res.status(403).json({ message: 'Not authorized to edit cases' })
  }

  await item.save()
  res.json({ item })
}))

// ── Delete case (soft delete — sets status to Withdrawn) ──────────────────
router.delete('/cases/:id', wrap(async (req, res) => {
  const role = req.session && req.session.userRole
  const userId = req.session && req.session.userId
  const item = await Case.findById(req.params.id)
  if (!item) return res.status(404).json({ message: 'Case not found' })

  if (role === 'citizen' || role === 'advocate') {
    if (String(item.submittedBy) !== String(userId)) {
      return res.status(403).json({ message: 'You can only withdraw your own cases' })
    }
    if (item.status !== 'Filed') {
      return res.status(403).json({ message: 'Only Filed cases can be withdrawn' })
    }
    item.status = 'Withdrawn'
    await item.save()
    return res.json({ message: 'Case withdrawn successfully', item })
  }

  if (role === 'clerk' || role === 'admin') {
    item.status = 'Withdrawn'
    await item.save()
    return res.json({ message: 'Case withdrawn successfully', item })
  }

  return res.status(403).json({ message: 'Not authorized to delete cases' })
}))

// ── Hearings ───────────────────────────────────────────────────────────────
router.get('/hearings', wrap(async (req, res) => {
  const query = {}
  if (req.query.caseId) query.caseId = req.query.caseId
  const items = await Hearing.find(query).populate('caseId', 'caseNumber title').sort({ date: 1, time: 1 })
  res.json({ items })
}))

router.post('/hearings', wrap(async (req, res) => {
  const { caseId, date, time, status, courtroom } = req.body
  if (!caseId || !date || !time) {
    return res.status(400).json({ message: 'caseId, date, and time are required' })
  }

  const found = await Case.findById(caseId)
  if (!found) return res.status(404).json({ message: 'Linked case not found' })

  const item = await Hearing.create({
    caseId,
    date,
    time,
    status: status || 'Scheduled',
    courtroom: courtroom || found.court || 'Courtroom 1',
  })

  await Case.findByIdAndUpdate(caseId, { status: 'Hearing Scheduled' })
  res.status(201).json({ item })
}))

// ── Edit hearing (clerk/admin only) ───────────────────────────────────────
router.patch('/hearings/:id', wrap(async (req, res) => {
  const role = req.session && req.session.userRole
  if (role !== 'clerk' && role !== 'admin' && role !== 'judge') {
    return res.status(403).json({ message: 'Not authorized to edit hearings' })
  }
  const item = await Hearing.findById(req.params.id)
  if (!item) return res.status(404).json({ message: 'Hearing not found' })

  const { date, time, status, courtroom } = req.body
  Object.assign(item, {
    date: date || item.date,
    time: time || item.time,
    status: status || item.status,
    courtroom: courtroom || item.courtroom,
  })
  await item.save()
  res.json({ item })
}))

// ── Delete hearing (clerk/admin only) ─────────────────────────────────────
router.delete('/hearings/:id', wrap(async (req, res) => {
  const role = req.session && req.session.userRole
  if (role !== 'clerk' && role !== 'admin') {
    return res.status(403).json({ message: 'Not authorized to delete hearings' })
  }
  const item = await Hearing.findByIdAndDelete(req.params.id)
  if (!item) return res.status(404).json({ message: 'Hearing not found' })
  res.json({ message: 'Hearing deleted', item })
}))

// ── Documents ──────────────────────────────────────────────────────────────
router.get('/documents', wrap(async (req, res) => {
  const query = {}
  if (req.query.caseId) query.caseId = req.query.caseId
  const items = await Document.find(query).populate('caseId', 'caseNumber title').sort({ createdAt: -1 })
  res.json({ items })
}))

router.post('/documents', upload.single('file'), wrap(async (req, res) => {
  const { caseId, category, uploadedBy } = req.body
  if (!caseId) return res.status(400).json({ message: 'caseId is required' })
  if (!req.file) return res.status(400).json({ message: 'file is required' })

  const found = await Case.findById(caseId)
  if (!found) return res.status(404).json({ message: 'Linked case not found' })

  const uploaded = await uploadBufferToGridFS(req.file, {
    caseId,
    uploadedBy: uploadedBy || 'Registry User',
    category: category || 'Filing',
  })

  const item = new Document({
    caseId,
    docType: 'Upload',
    name: req.file.originalname,
    category: category || 'Filing',
    uploadedBy: uploadedBy || 'Registry User',
    gridFsFileId: uploaded.fileId,
    fileUrl: '',
    uploadedOn: new Date().toISOString().slice(0, 10),
    ...buildCaseSnapshotFields(found),
  })

  item.fileUrl = `/api/documents/${item._id}/file`
  await item.save()

  res.status(201).json({ item })
}))

router.get('/documents/:id/file', wrap(async (req, res) => {
  const item = await Document.findById(req.params.id)
  if (!item) return res.status(404).json({ message: 'Document not found' })

  if (item.gridFsFileId) {
    const bucket = getUploadsBucket()
    const files = await bucket.find({ _id: item.gridFsFileId }).limit(1).toArray()
    const fileMeta = files[0]
    if (!fileMeta) return res.status(404).json({ message: 'Stored file not found' })

    const safeDownloadName = String(item.name || fileMeta.filename || 'document')
      .replace(/[\\/:*?"<>|]+/g, '_')

    res.setHeader('Content-Type', fileMeta.contentType || 'application/octet-stream')
    res.setHeader('Content-Disposition', `attachment; filename="${safeDownloadName}"`)

    const downloadStream = bucket.openDownloadStream(item.gridFsFileId)
    downloadStream.on('error', (error) => {
      if (!res.headersSent) {
        res.status(500).json({ message: error.message || 'Unable to stream file' })
        return
      }
      res.destroy(error)
    })
    downloadStream.pipe(res)
    return
  }

  if (typeof item.fileUrl === 'string' && item.fileUrl.startsWith('/uploads/')) {
    return res.redirect(item.fileUrl)
  }

  return res.status(404).json({ message: 'No downloadable file linked to this record' })
}))

// ══════════════════════════════════════════════════════════════════════════
// USER ADMIN ROUTES — Admin only
// ══════════════════════════════════════════════════════════════════════════
const User = require('../models/User')
const DeletedUser = require('../models/DeletedUser')
const { requireRole } = require('../middleware/auth')

// List all users (admin only)
router.get('/users', requireRole('admin'), wrap(async (req, res) => {
  const users = await User.find({})
    .select('-passwordHash')
    .sort({ createdAt: -1 })
  res.json({ items: users })
}))

// List archived/deleted users (admin only)
router.get('/users/deleted', requireRole('admin'), wrap(async (req, res) => {
  const items = await DeletedUser.find({}).sort({ deletedAt: -1 })
  res.json({ items })
}))

// Restore a deleted user back to active Users (admin only)
router.post('/users/restore/:id', requireRole('admin'), wrap(async (req, res) => {
  const archived = await DeletedUser.findById(req.params.id)
  if (!archived) return res.status(404).json({ message: 'Archived user not found' })

  // Check if email is already taken (someone may have re-registered with same email)
  const existing = await User.findOne({ email: archived.email })
  if (existing) {
    return res.status(409).json({
      message: `Cannot restore — email ${archived.email} is already registered to another active account`,
    })
  }

  // Restore user back to Users collection with original data
  const restored = await User.create({
    _id:          archived.originalId, // restore with original ID so submittedBy links work
    fullName:     archived.fullName,
    email:        archived.email,
    passwordHash: archived.passwordHash, // original password restored — they can login
    role:         archived.role,
    barNumber:    archived.barNumber,
    isActive:     true, // always restore as active
  })

  // Remove from archive
  await DeletedUser.findByIdAndDelete(req.params.id)

  res.json({
    message: `${archived.fullName} has been restored and can now log in`,
    item: { _id: restored._id, email: restored.email, role: restored.role },
  })
}))

// Update user role or status (admin only)
router.patch('/users/:id', requireRole('admin'), wrap(async (req, res) => {
  const { role, isActive, fullName } = req.body
  const validRoles = ['admin', 'judge', 'clerk', 'advocate', 'citizen']
  if (role && !validRoles.includes(role)) {
    return res.status(400).json({ message: 'Invalid role' })
  }

  const user = await User.findById(req.params.id).select('-passwordHash')
  if (!user) return res.status(404).json({ message: 'User not found' })

  // Prevent admin from removing their own admin role
  if (String(user._id) === String(req.session.userId) && role && role !== 'admin') {
    return res.status(403).json({ message: 'You cannot change your own role' })
  }

  if (role !== undefined) user.role = role
  if (isActive !== undefined) user.isActive = isActive
  if (fullName !== undefined) user.fullName = fullName
  await user.save()

  res.json({ item: user })
}))

// Delete user — archives to DeletedUsers before removing (admin only)
router.delete('/users/:id', requireRole('admin'), wrap(async (req, res) => {
  if (String(req.params.id) === String(req.session.userId)) {
    return res.status(403).json({ message: 'You cannot delete your own account' })
  }

  const user = await User.findById(req.params.id)
  if (!user) return res.status(404).json({ message: 'User not found' })

  // Count how many cases they submitted
  const caseCount = await Case.countDocuments({ submittedBy: user._id })

  // Archive the full user record before deleting
  await DeletedUser.create({
    originalId:   user._id,
    fullName:     user.fullName,
    email:        user.email,
    role:         user.role,
    barNumber:    user.barNumber,
    isActive:     user.isActive,
    passwordHash: user.passwordHash,
    deletedBy:    req.session.userId,
    deletedAt:    new Date(),
    reason:       req.body.reason || 'Deleted by administrator',
    caseCount,
  })

  // Now remove from active users
  await User.findByIdAndDelete(req.params.id)

  res.json({
    message: 'User archived and removed successfully',
    archived: { email: user.email, caseCount },
  })
}))

module.exports = router

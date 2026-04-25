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

  const query = {}
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
  const { title, type, status, priority, court, judge, petitioner, respondent, summary } = req.body
  if (!title || !type) {
    return res.status(400).json({ message: 'title and type are required' })
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
  })

  await createRegistrationDocumentForCase(item)

  res.status(201).json({ item })
}))

router.get('/cases/:id', wrap(async (req, res) => {
  const item = await Case.findById(req.params.id)
  if (!item) return res.status(404).json({ message: 'Case not found' })
  res.json({ item })
}))

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

module.exports = router

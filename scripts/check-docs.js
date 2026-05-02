const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../.env') })
const mongoose = require('mongoose')
const Document = require('../server/models/Document')
const Case = require('../server/models/Case')

async function check() {
  await mongoose.connect(process.env.MONGODB_URI)

  // Find the case
  const c = await Case.findOne({ caseNumber: 'C-2026-013' })
  console.log(`Case: ${c.caseNumber} | ${c.title} | ID: ${c._id}`)
  console.log('')

  // Find all documents for this case
  const docs = await Document.find({ caseId: c._id }).lean()
  console.log(`=== DOCUMENTS FOR C-2026-013 (${docs.length}) ===`)
  docs.forEach(d => {
    console.log(`  ID: ${d._id}`)
    console.log(`  Name: ${d.name}`)
    console.log(`  Category: ${d.category}`)
    console.log(`  Uploaded By: ${d.uploadedBy}`)
    console.log(`  File URL: ${d.fileUrl || 'NONE'}`)
    console.log(`  Created: ${d.createdAt || d.uploadedOn}`)
    console.log('')
  })

  // Show ALL documents in the collection
  const allDocs = await Document.find({}).lean()
  console.log(`=== ALL DOCUMENTS IN DB (${allDocs.length}) ===`)
  allDocs.forEach(d => {
    console.log(`  ${String(d.caseId).slice(-6)} | ${d.name} | ${d.category} | by ${d.uploadedBy}`)
  })

  // Check collections that exist
  const collections = await mongoose.connection.db.listCollections().toArray()
  console.log('')
  console.log('=== ALL COLLECTIONS ===')
  collections.forEach(col => console.log(`  ${col.name}`))

  await mongoose.disconnect()
}

check().catch(e => { console.error(e.message); process.exit(1) })

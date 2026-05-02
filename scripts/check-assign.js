const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../.env') })
const mongoose = require('mongoose')
const Case = require('../server/models/Case')
const Hearing = require('../server/models/Hearing')

async function check() {
  await mongoose.connect(process.env.MONGODB_URI)

  // Check case C-2026-013
  const c = await Case.findOne({ caseNumber: 'C-2026-013' }).lean()
  console.log('=== CASE C-2026-013 ===')
  console.log(`  Title: ${c.title}`)
  console.log(`  Judge: ${c.judge}`)
  console.log(`  Court: ${c.court}`)
  console.log(`  Status: ${c.status}`)
  console.log(`  Advocate: ${c.advocateName}`)
  console.log('')

  // Check all hearings for this case
  const hearings = await Hearing.find({ caseId: c._id }).lean()
  console.log(`=== HEARINGS FOR C-2026-013 (${hearings.length}) ===`)
  hearings.forEach(h => {
    console.log(`  Date: ${h.date} | Time: ${h.time} | Status: ${h.status} | Courtroom: ${h.courtroom}`)
  })

  // Check all cases and their judge assignments
  console.log('')
  const cases = await Case.find({}).sort({ createdAt: -1 }).lean()
  console.log(`=== ALL CASES WITH JUDGES ===`)
  cases.forEach(c2 => {
    const hasJudge = c2.judge && c2.judge !== 'Not Assigned'
    console.log(`  ${c2.caseNumber} | Judge: ${c2.judge} | Status: ${c2.status} ${hasJudge ? '✓' : ''}`)
  })

  await mongoose.disconnect()
}

check().catch(e => { console.error(e.message); process.exit(1) })

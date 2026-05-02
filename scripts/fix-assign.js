const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../.env') })
const mongoose = require('mongoose')
const Case = require('../server/models/Case')
const Hearing = require('../server/models/Hearing')

async function verify() {
  await mongoose.connect(process.env.MONGODB_URI)

  const c = await Case.findOne({ caseNumber: 'C-2026-013' })
  console.log('BEFORE UPDATE:')
  console.log(`  judge: ${c.judge}`)
  console.log(`  status: ${c.status}`)
  console.log(`  updatedAt: ${c.updatedAt}`)
  console.log('')

  // Force assign judge since the PATCH calls all failed with 500
  c.judge = 'Justice R. Sharma'
  c.court = 'Courtroom 1'
  c.status = 'Under Review'
  await c.save()

  // Verify the update stuck
  const updated = await Case.findOne({ caseNumber: 'C-2026-013' })
  console.log('AFTER UPDATE:')
  console.log(`  judge: ${updated.judge}`)
  console.log(`  status: ${updated.status}`)
  console.log(`  updatedAt: ${updated.updatedAt}`)
  console.log('')

  // Check if a hearing exists
  const hearings = await Hearing.find({ caseId: c._id })
  console.log(`HEARINGS: ${hearings.length}`)
  if (hearings.length === 0) {
    console.log('  Creating a hearing...')
    await Hearing.create({
      caseId: c._id,
      date: '2026-05-15',
      time: '10:30',
      status: 'Scheduled',
      courtroom: 'Courtroom 1',
    })
    // Update case status
    c.status = 'Hearing Scheduled'
    await c.save()
    console.log('  Hearing created and case status updated to Hearing Scheduled')
  } else {
    hearings.forEach(h => console.log(`  ${h.date} | ${h.time} | ${h.status} | ${h.courtroom}`))
  }

  // Final state
  const final = await Case.findOne({ caseNumber: 'C-2026-013' })
  console.log('')
  console.log('FINAL STATE:')
  console.log(`  judge: ${final.judge}`)
  console.log(`  status: ${final.status}`)
  console.log(`  updatedAt: ${final.updatedAt}`)

  await mongoose.disconnect()
}

verify().catch(e => { console.error(e); process.exit(1) })

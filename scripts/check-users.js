const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../.env') })
const mongoose = require('mongoose')
const Case = require('../server/models/Case')
const User = require('../server/models/User')

async function check() {
  await mongoose.connect(process.env.MONGODB_URI)

  // Check for Gaurav Singh Bhakuni
  const gaurav = await User.findOne({ fullName: /gaurav/i })
  console.log('── ADVOCATE SEARCH ──')
  if (gaurav) {
    console.log(`  Found: ${gaurav.fullName} | ${gaurav.email} | role: ${gaurav.role} | active: ${gaurav.isActive}`)
  } else {
    console.log('  ✗ No user found with name containing "Gaurav"')
    // Search all advocates
    const advocates = await User.find({ role: 'advocate' }).select('fullName email isActive')
    console.log(`\n── ALL ADVOCATES (${advocates.length}) ──`)
    advocates.forEach(a => console.log(`  ${a.fullName.padEnd(25)} ${a.email.padEnd(35)} active: ${a.isActive}`))
  }

  // Show latest cases
  const cases = await Case.find({}).sort({ createdAt: -1 }).limit(5)
  console.log(`\n── LATEST 5 CASES ──`)
  for (const c of cases) {
    let submitter = 'No submitter'
    if (c.submittedBy) {
      const user = await User.findById(c.submittedBy).select('email fullName')
      submitter = user ? `${user.fullName} (${user.email})` : `[deleted] ${c.submittedBy}`
    }
    console.log(`  ${c.caseNumber} | ${c.title}`)
    console.log(`    Submitted by: ${submitter}`)
    console.log(`    Advocate: ${c.advocateName || 'None'} (ID: ${c.advocate || 'null'})`)
    console.log(`    Status: ${c.status} | Priority: ${c.priority}`)
    console.log('')
  }

  await mongoose.disconnect()
}

check().catch(e => { console.error(e.message); process.exit(1) })

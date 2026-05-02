const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../.env') })
const mongoose = require('mongoose')
const User = require('../server/models/User')

async function check() {
  await mongoose.connect(process.env.MONGODB_URI)

  const judges = await User.find({ role: 'judge' }).select('fullName email isActive')
  console.log('JUDGES IN DATABASE:')
  if (judges.length === 0) {
    console.log('  *** NONE — no judge accounts exist! ***')
  } else {
    judges.forEach(j => console.log(`  ${j.fullName} | ${j.email} | active: ${j.isActive}`))
  }

  console.log('')
  const roles = await User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }])
  console.log('ALL ROLES:')
  roles.forEach(r => console.log(`  ${r._id}: ${r.count}`))

  await mongoose.disconnect()
}

check().catch(e => { console.error(e.message); process.exit(1) })

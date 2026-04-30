/**
 * seed-users.js
 * Run once to create all default demo users in MongoDB.
 * Usage: node scripts/seed-users.js
 */

const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../.env') })

const mongoose = require('mongoose')
const User = require('../server/models/User')

const SEED_USERS = [
  {
    fullName: 'Jatin Arya',
    email: 'admin@court.local',
    password: 'Admin@1234',
    role: 'admin',
    designation: 'Chief Court Registrar',
  },
  {
    fullName: 'Justice R. Sharma',
    email: 'judge@court.local',
    password: 'Judge@1234',
    role: 'judge',
    designation: 'District & Sessions Judge',
    courtId: 'Courtroom 1',
  },
  {
    fullName: 'Neha Verma',
    email: 'clerk@court.local',
    password: 'Clerk@1234',
    role: 'clerk',
    designation: 'Registry Clerk',
    courtId: 'Main Registry',
  },
  {
    fullName: 'Rahul Mehta',
    email: 'lawyer@court.local',
    password: 'Lawyer@1234',
    role: 'advocate',
    barNumber: 'BAR/2020/0042',
  },
  {
    fullName: 'Priya Singh',
    email: 'citizen@court.local',
    password: 'Citizen@1234',
    role: 'citizen',
  },
]

async function seed() {
  const uri =
    process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    'mongodb://127.0.0.1:27017/portal_node_app'

  await mongoose.connect(uri)
  console.log('Connected to MongoDB')

  let created = 0
  let skipped = 0

  for (const data of SEED_USERS) {
    const existing = await User.findOne({ email: data.email })
    if (existing) {
      console.log(`  ⚠  Skipped (already exists): ${data.email}`)
      skipped++
      continue
    }

    const passwordHash = await User.hashPassword(data.password)
    await User.create({
      fullName: data.fullName,
      email: data.email,
      passwordHash,
      role: data.role,
      barNumber: data.barNumber || '',
      courtId: data.courtId || '',
      designation: data.designation || '',
    })

    console.log(`  ✓  Created [${data.role.padEnd(8)}] ${data.email}  (password: ${data.password})`)
    created++
  }

  console.log(`\nDone. Created: ${created}, Skipped: ${skipped}`)
  await mongoose.disconnect()
}

seed().catch((err) => {
  console.error('Seed failed:', err.message)
  process.exit(1)
})

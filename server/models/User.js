const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const ROLES = ['citizen', 'advocate', 'clerk', 'judge', 'admin']

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ROLES,
      default: 'citizen',
    },
    // Advocate-specific
    barNumber: { type: String, default: '' },
    // Judge / Clerk specific
    courtId: { type: String, default: '' },
    designation: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date, default: null },
  },
  { timestamps: true }
)

// Instance method: verify password
userSchema.methods.verifyPassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash)
}

// Static method: hash a plain password
userSchema.statics.hashPassword = function (plain) {
  return bcrypt.hash(plain, 12)
}

// Safe public projection (never expose passwordHash)
userSchema.methods.toPublic = function () {
  return {
    id: this._id,
    fullName: this.fullName,
    email: this.email,
    role: this.role,
    barNumber: this.barNumber,
    courtId: this.courtId,
    designation: this.designation,
    isActive: this.isActive,
    lastLogin: this.lastLogin,
    createdAt: this.createdAt,
  }
}

module.exports = mongoose.model('User', userSchema)
module.exports.ROLES = ROLES

const mongoose = require('mongoose')

const deletedUserSchema = new mongoose.Schema(
  {
    // Original user fields preserved exactly
    originalId:   { type: mongoose.Schema.Types.ObjectId, required: true },
    fullName:     { type: String, default: '' },
    email:        { type: String, required: true },
    role:         { type: String },
    barNumber:    { type: String },
    isActive:     { type: Boolean },
    passwordHash: { type: String }, // kept for audit, never exposed

    // Deletion metadata
    deletedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // which admin deleted
    deletedAt:   { type: Date, default: Date.now },
    reason:      { type: String, default: 'Deleted by administrator' },

    // Snapshot of their case count at time of deletion
    caseCount:   { type: Number, default: 0 },
  },
  { timestamps: true }
)

module.exports = mongoose.model('DeletedUser', deletedUserSchema)

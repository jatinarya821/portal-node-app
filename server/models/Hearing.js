const mongoose = require('mongoose')

const hearingSchema = new mongoose.Schema(
  {
    caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case', required: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    status: { type: String, default: 'Scheduled' },
    courtroom: { type: String, default: 'Courtroom 1' },
  },
  { timestamps: true }
)

module.exports = mongoose.model('Hearing', hearingSchema)

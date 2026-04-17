const mongoose = require('mongoose')

const caseSchema = new mongoose.Schema(
  {
    caseNumber: { type: String, required: true, unique: true },
    title: { type: String, required: true, trim: true },
    type: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['Filed', 'Under Review', 'Hearing Scheduled', 'Adjourned', 'Closed'],
      default: 'Filed',
    },
    court: { type: String, default: 'Courtroom 1' },
    judge: { type: String, default: 'Not Assigned' },
    petitioner: { type: String, default: '' },
    respondent: { type: String, default: '' },
    summary: { type: String, default: '' },
  },
  { timestamps: true }
)

module.exports = mongoose.model('Case', caseSchema)

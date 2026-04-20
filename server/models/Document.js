const mongoose = require('mongoose')

const documentSchema = new mongoose.Schema(
  {
    caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case', required: true },
    docType: {
      type: String,
      enum: ['Upload', 'CaseRegistration'],
      default: 'Upload',
    },
    name: { type: String, required: true },
    category: { type: String, default: 'Filing' },
    uploadedBy: { type: String, default: 'Registry User' },
    fileUrl: { type: String, default: '' },
    uploadedOn: { type: String, required: true },
    caseNumber: { type: String, default: '' },
    title: { type: String, default: '' },
    type: { type: String, default: '' },
    status: { type: String, default: '' },
    court: { type: String, default: '' },
    judge: { type: String, default: '' },
    petitioner: { type: String, default: '' },
    respondent: { type: String, default: '' },
    summary: { type: String, default: '' },
  },
  { timestamps: true }
)

module.exports = mongoose.model('Document', documentSchema)

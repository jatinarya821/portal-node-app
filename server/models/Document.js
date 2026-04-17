const mongoose = require('mongoose')

const documentSchema = new mongoose.Schema(
  {
    caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case', required: true },
    name: { type: String, required: true },
    category: { type: String, default: 'Filing' },
    uploadedBy: { type: String, default: 'Registry User' },
    fileUrl: { type: String, required: true },
    uploadedOn: { type: String, required: true },
  },
  { timestamps: true }
)

module.exports = mongoose.model('Document', documentSchema)

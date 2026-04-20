// Run this file with the MongoDB VS Code extension ("Play" button).
// It shows the registered cases that were mirrored into documents collection.

use('portal_node_app');

db.getCollection('documents')
  .find({ docType: 'CaseRegistration' })
  .sort({ createdAt: -1 })
  .limit(20);

// Optional: check a specific record by id
// db.getCollection('documents').find({ _id: ObjectId('69e60369b3dda1d47c1f2286') });

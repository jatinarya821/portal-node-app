const mongoose = require('mongoose')

async function connectDB(uri) {
  if (!uri) {
    throw new Error('MONGODB_URI is not set')
  }

  // Assumption: traditional long-running local Node server with moderate traffic.
  return mongoose.connect(uri, {
    maxPoolSize: 20,
    minPoolSize: 5,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 30000,
    serverSelectionTimeoutMS: 5000,
    maxIdleTimeMS: 300000,
  })
}

module.exports = connectDB

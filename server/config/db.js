const mongoose = require('mongoose')

async function connectDB(uri) {
  // Assumption: traditional long-running local Node server with moderate traffic.
  await mongoose.connect(uri, {
    maxPoolSize: 20,
    minPoolSize: 5,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 30000,
    serverSelectionTimeoutMS: 5000,
    maxIdleTimeMS: 300000,
  })
}

module.exports = connectDB

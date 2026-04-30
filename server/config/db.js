const mongoose = require('mongoose')

let cachedConnection = null
let cachedConnectionPromise = null

async function connectDB(uri) {
  if (!uri) {
    throw new Error('MongoDB URI is not set. Configure MONGODB_URI (or MONGO_URI / DATABASE_URL).')
  }

  if (cachedConnection) {
    return cachedConnection
  }

  if (cachedConnectionPromise) {
    return cachedConnectionPromise
  }

  // Reuse one connection per runtime instance to avoid pool spikes on serverless.
  cachedConnectionPromise = mongoose.connect(uri, {
    maxPoolSize: 10,
    minPoolSize: 0,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 30000,
    serverSelectionTimeoutMS: 5000,
    maxIdleTimeMS: 300000,
  })
    .then((connection) => {
      cachedConnection = connection
      return connection
    })
    .catch((error) => {
      cachedConnectionPromise = null
      throw error
    })

  return cachedConnectionPromise
}

module.exports = connectDB

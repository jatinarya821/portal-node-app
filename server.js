const express = require('express')
const path = require('path')
const cors = require('cors')
const dotenv = require('dotenv')

const connectDB = require('./server/config/db')
const apiRoutes = require('./server/routes/apiRoutes')

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000
const pagesDir = path.join(__dirname, 'pages')

connectDB(process.env.MONGODB_URI)
  .then((connection) => {
    const { host, name } = connection.connection
    console.log(`MongoDB connected: ${host}/${name}`)
  })
  .catch((error) => {
    console.error('MongoDB connection failed:', error.message)
    if (require.main === module) {
      process.exit(1)
    }
  })

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use('/public', express.static(path.join(__dirname, 'public')))
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))
app.use('/api', apiRoutes)

app.get('/', (req, res) => {
  res.redirect('/login')
})

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' })
})

app.get('/login', (req, res) => {
  res.sendFile(path.join(pagesDir, 'login.html'))
})

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(pagesDir, 'dashboard.html'))
})

app.get('/cases', (req, res) => {
  res.sendFile(path.join(pagesDir, 'cases.html'))
})

app.get('/hearings', (req, res) => {
  res.sendFile(path.join(pagesDir, 'hearings.html'))
})

app.get('/documents', (req, res) => {
  res.sendFile(path.join(pagesDir, 'documents.html'))
})

app.get('/case-detail', (req, res) => {
  res.sendFile(path.join(pagesDir, 'case-detail.html'))
})

app.use((error, req, res, next) => {
  console.error(error)
  res.status(500).json({ message: error.message || 'Internal server error' })
})

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Portal app running at http://127.0.0.1:${PORT}`)
  })
}

module.exports = app

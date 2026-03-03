require('dotenv').config()
const express = require('express')
const cors = require('cors')
const db = require('./db')
const bcrypt = require('bcryptjs')
const { signToken, verifyTokenMiddleware } = require('./auth')

const app = express()
const port = process.env.PORT || 4000

app.use(cors())
app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() })
})

app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from Nyumba Freshi backend' })
})

app.get('/api/dbtime', (req, res) => {
  try {
    const row = db.prepare("SELECT datetime('now') as now").get()
    res.json({ now: row.now })
  } catch (err) {
    console.error('DB query failed', err)
    res.status(500).json({ error: 'DB query failed' })
  }
})

// Demo login route: accepts { "username": "bob" } and returns a JWT
app.post('/api/login', (req, res) => {
  const { username } = req.body || {}
  if (!username) return res.status(400).json({ error: 'username required' })
  // In real apps validate credentials. This is a demo token.
  const token = signToken({ username })
  res.json({ token })
})

// Registration route: creates user and worker profile (if role=Worker)
app.post('/api/register', async (req, res) => {
  const {
    role = 'Homeowner',
    fullName,
    phone,
    location,
    estate,
    password,
    idNumber,
    servicesOffered,
    availability,
  } = req.body || {}

  if (!fullName || !phone || !password) return res.status(400).json({ error: 'fullName, phone and password required' })

  try {
    const passwordHash = await bcrypt.hash(password, 10)

    // SQLite transaction
    const insertUser = db.prepare(
      'INSERT INTO users (role, full_name, phone, password_hash, location, estate) VALUES (?, ?, ?, ?, ?, ?)'
    )
    const insertWorkerProfile = db.prepare(
      'INSERT INTO worker_profiles (user_id, id_number, availability) VALUES (?, ?, ?)'
    )
    const insertWorkerService = db.prepare(
      'INSERT INTO worker_services (worker_profile_id, service) VALUES (?, ?)'
    )

    const transaction = db.transaction(() => {
      const result = insertUser.run(role, fullName, phone, passwordHash, location || null, estate || null)
      const userId = result.lastInsertRowid

      if (role === 'Worker') {
        const workerResult = insertWorkerProfile.run(userId, idNumber || null, availability || null)
        const profileId = workerResult.lastInsertRowid
        
        if (Array.isArray(servicesOffered)) {
          for (const service of servicesOffered) {
            insertWorkerService.run(profileId, service)
          }
        }
      }

      return userId
    })

    const userId = transaction()
    const token = signToken({ userId, role, fullName })
    return res.json({ token })
  } catch (err) {
    console.error('Registration error', err)
    return res.status(500).json({ error: 'Registration error' })
  }
})

// Protected demo route
app.get('/api/protected', verifyTokenMiddleware, (req, res) => {
  res.json({ message: `Hello ${req.user.username}`, user: req.user })
})

app.listen(port, () => {
  console.log(`Nyumba Freshi backend running on http://localhost:${port}`)
})

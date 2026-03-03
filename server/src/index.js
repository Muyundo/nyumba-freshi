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

function normalizePhone(phone) {
  return String(phone || '').replace(/\D/g, '')
}

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

app.post('/api/login', async (req, res) => {
  const { role = 'Homeowner', phone, password } = req.body || {}
  if (!phone || !password) return res.status(400).json({ error: 'phone and password required' })

  try {
    const normalizedPhone = normalizePhone(phone)
    const findUser = db.prepare(
      'SELECT id, role, full_name, phone, password_hash FROM users WHERE role = ? AND phone = ? LIMIT 1'
    )
    const user = findUser.get(role, normalizedPhone)

    if (!user) return res.status(401).json({ error: 'Invalid credentials' })

    const isMatch = await bcrypt.compare(password, user.password_hash)
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' })

    const token = signToken({ userId: user.id, role: user.role, fullName: user.full_name })
    return res.json({
      token,
      user: {
        userId: user.id,
        role: user.role,
        fullName: user.full_name,
        phone: user.phone,
      },
    })
  } catch (err) {
    console.error('Login error', err)
    return res.status(500).json({ error: 'Login error' })
  }
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
    const normalizedPhone = normalizePhone(phone)

    const existingUser = db
      .prepare('SELECT id FROM users WHERE role = ? AND phone = ? LIMIT 1')
      .get(role, normalizedPhone)

    if (existingUser) {
      return res.status(409).json({ error: 'A user with this role and phone already exists' })
    }

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
      const result = insertUser.run(role, fullName, normalizedPhone, passwordHash, location || null, estate || null)
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
    return res.status(201).json({
      message: 'Registered successfully. Please login.',
      user: {
        userId,
        role,
        fullName,
        phone: normalizedPhone,
      },
    })
  } catch (err) {
    console.error('Registration error', err)
    return res.status(500).json({ error: 'Registration error' })
  }
})

// Protected demo route
app.get('/api/protected', verifyTokenMiddleware, (req, res) => {
  const name = req.user.fullName || req.user.username || 'User'
  res.json({ message: `Hello ${name}`, user: req.user })
})

app.listen(port, () => {
  console.log(`Nyumba Freshi backend running on http://localhost:${port}`)
})

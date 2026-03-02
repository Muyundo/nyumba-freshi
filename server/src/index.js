const express = require('express')
const cors = require('cors')
const pool = require('./db')
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

app.get('/api/dbtime', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT NOW() as now')
    res.json({ now: rows[0].now })
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

    const conn = await pool.getConnection()
    try {
      await conn.beginTransaction()

      // Create minimal tables if they don't exist (MVP-friendly)
      await conn.query(`
        CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          role VARCHAR(32),
          full_name VARCHAR(255),
          phone VARCHAR(64),
          password_hash VARCHAR(255),
          location VARCHAR(255),
          estate VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB
      `)

      await conn.query(`
        CREATE TABLE IF NOT EXISTS worker_profiles (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT,
          id_number VARCHAR(128),
          availability VARCHAR(32),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX (user_id)
        ) ENGINE=InnoDB
      `)

      await conn.query(`
        CREATE TABLE IF NOT EXISTS worker_services (
          id INT AUTO_INCREMENT PRIMARY KEY,
          worker_profile_id INT,
          service VARCHAR(64),
          INDEX (worker_profile_id)
        ) ENGINE=InnoDB
      `)

      const [r] = await conn.query(
        'INSERT INTO users (role, full_name, phone, password_hash, location, estate) VALUES (?, ?, ?, ?, ?, ?)',
        [role, fullName, phone, passwordHash, location || null, estate || null]
      )

      const userId = r.insertId

      if (role === 'Worker') {
        const [wp] = await conn.query(
          'INSERT INTO worker_profiles (user_id, id_number, availability) VALUES (?, ?, ?)',
          [userId, idNumber || null, availability || null]
        )
        const profileId = wp.insertId
        if (Array.isArray(servicesOffered)) {
          for (const s of servicesOffered) {
            await conn.query('INSERT INTO worker_services (worker_profile_id, service) VALUES (?, ?)', [profileId, s])
          }
        }
      }

      await conn.commit()
      conn.release()

      const token = signToken({ userId, role, fullName })
      return res.json({ token })
    } catch (err) {
      await conn.rollback()
      conn.release()
      console.error('Registration failed', err)
      return res.status(500).json({ error: 'Registration failed' })
    }
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

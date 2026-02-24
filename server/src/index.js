const express = require('express')
const cors = require('cors')
const pool = require('./db')
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

// Protected demo route
app.get('/api/protected', verifyTokenMiddleware, (req, res) => {
  res.json({ message: `Hello ${req.user.username}`, user: req.user })
})

app.listen(port, () => {
  console.log(`Nyumba Freshi backend running on http://localhost:${port}`)
})

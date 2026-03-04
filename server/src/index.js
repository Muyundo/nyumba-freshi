require('dotenv').config()
const express = require('express')
const cors = require('cors')
const db = require('./db')
const bcrypt = require('bcryptjs')
const { signToken, verifyTokenMiddleware } = require('./auth')

const app = express()
const port = process.env.PORT || 4000
const host = process.env.HOST || '0.0.0.0'

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

// Get all workers with their services
app.get('/api/workers', (req, res) => {
  try {
    const query = db.prepare(`
      SELECT 
        u.id,
        u.full_name,
        u.phone,
        u.location,
        u.estate,
        wp.id as profile_id,
        GROUP_CONCAT(ws.service, ',') as services
      FROM users u
      LEFT JOIN worker_profiles wp ON u.id = wp.user_id
      LEFT JOIN worker_services ws ON wp.id = ws.worker_profile_id
      WHERE u.role = 'Worker'
      GROUP BY u.id
    `)
    const workers = query.all()
    
    // Transform services string into array
    const transformedWorkers = workers.map(w => ({
      id: w.id,
      fullName: w.full_name,
      phone: w.phone,
      location: w.location,
      estate: w.estate,
      services: w.services ? w.services.split(',') : []
    }))
    
    res.json(transformedWorkers)
  } catch (err) {
    console.error('Get workers error', err)
    res.status(500).json({ error: 'Failed to fetch workers' })
  }
})

// Get single worker details
app.get('/api/workers/:id', (req, res) => {
  try {
    const { id } = req.params
    const query = db.prepare(`
      SELECT 
        u.id,
        u.full_name,
        u.phone,
        u.location,
        u.estate,
        wp.id as profile_id,
        wp.id_number,
        wp.availability,
        GROUP_CONCAT(ws.service, ',') as services
      FROM users u
      LEFT JOIN worker_profiles wp ON u.id = wp.user_id
      LEFT JOIN worker_services ws ON wp.id = ws.worker_profile_id
      WHERE u.role = 'Worker' AND u.id = ?
      GROUP BY u.id
    `)
    const worker = query.get(id)
    
    if (!worker) {
      return res.status(404).json({ error: 'Worker not found' })
    }
    
    res.json({
      id: worker.id,
      fullName: worker.full_name,
      phone: worker.phone,
      location: worker.location,
      estate: worker.estate,
      idNumber: worker.id_number,
      availability: worker.availability,
      services: worker.services ? worker.services.split(',') : []
    })
  } catch (err) {
    console.error('Get worker error', err)
    res.status(500).json({ error: 'Failed to fetch worker' })
  }
})

// Create a booking
app.post('/api/bookings', verifyTokenMiddleware, (req, res) => {
  const { workerId, service, bookingDate, notes } = req.body || {}
  const homeownerId = req.user.userId

  if (!workerId || !service || !bookingDate) {
    return res.status(400).json({ error: 'workerId, service, and bookingDate are required' })
  }

  try {
    const insertBooking = db.prepare(
      'INSERT INTO bookings (homeowner_id, worker_id, service, booking_date, notes, status) VALUES (?, ?, ?, ?, ?, ?)'
    )
    const result = insertBooking.run(homeownerId, workerId, service, bookingDate, notes || '', 'pending')
    
    res.status(201).json({
      id: result.lastInsertRowid,
      homeownerId,
      workerId,
      service,
      bookingDate,
      notes: notes || '',
      status: 'pending',
      createdAt: new Date().toISOString()
    })
  } catch (err) {
    console.error('Create booking error', err)
    res.status(500).json({ error: 'Failed to create booking' })
  }
})

// Get bookings for a homeowner
app.get('/api/homeowners/:homeownerId/bookings', verifyTokenMiddleware, (req, res) => {
  const { homeownerId } = req.params
  const requesterId = String(req.user.userId)

  if (requesterId !== String(homeownerId)) {
    return res.status(403).json({ error: 'Not authorized to view these bookings' })
  }

  try {
    const query = db.prepare(`
      SELECT
        b.id,
        b.homeowner_id,
        b.worker_id,
        b.service,
        b.booking_date,
        b.notes,
        b.status,
        b.created_at,
        u.full_name as worker_name,
        u.phone as worker_phone
      FROM bookings b
      LEFT JOIN users u ON b.worker_id = u.id
      WHERE b.homeowner_id = ?
      ORDER BY b.created_at DESC
    `)

    const bookings = query.all(homeownerId)

    return res.json(bookings.map((b) => ({
      id: b.id,
      homeownerId: b.homeowner_id,
      workerId: b.worker_id,
      service: b.service,
      bookingDate: b.booking_date,
      notes: b.notes,
      status: b.status,
      createdAt: b.created_at,
      workerName: b.worker_name,
      workerPhone: b.worker_phone,
    })))
  } catch (err) {
    console.error('Get homeowner bookings error', err)
    return res.status(500).json({ error: 'Failed to fetch homeowner bookings' })
  }
})

// Get bookings for a worker
app.get('/api/workers/:workerId/bookings', verifyTokenMiddleware, (req, res) => {
  const { workerId } = req.params
  const requesterId = String(req.user.userId)

  if (requesterId !== String(workerId)) {
    return res.status(403).json({ error: 'Not authorized to view these bookings' })
  }

  try {
    const query = db.prepare(`
      SELECT 
        b.id,
        b.homeowner_id,
        b.worker_id,
        b.service,
        b.booking_date,
        b.notes,
        b.status,
        b.created_at,
        u.full_name as homeowner_name,
        u.phone as homeowner_phone
      FROM bookings b
      LEFT JOIN users u ON b.homeowner_id = u.id
      WHERE b.worker_id = ?
      ORDER BY b.created_at DESC
    `)
    const bookings = query.all(workerId)
    
    res.json(bookings.map(b => ({
      id: b.id,
      homeownerId: b.homeowner_id,
      workerId: b.worker_id,
      service: b.service,
      bookingDate: b.booking_date,
      notes: b.notes,
      status: b.status,
      createdAt: b.created_at,
      homeownerName: b.homeowner_name,
      homeownerPhone: b.homeowner_phone
    })))
  } catch (err) {
    console.error('Get worker bookings error', err)
    res.status(500).json({ error: 'Failed to fetch bookings' })
  }
})

// Accept, decline, or cancel a booking
app.patch('/api/bookings/:bookingId', verifyTokenMiddleware, (req, res) => {
  const { bookingId } = req.params
  const { status } = req.body || {}
  const workerId = req.user.userId

  if (!status || !['accepted', 'declined', 'cancelled'].includes(status)) {
    return res.status(400).json({ error: 'status must be accepted, declined, or cancelled' })
  }

  try {
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ? AND worker_id = ?').get(bookingId, workerId)
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found or not authorized' })
    }

    const updateBooking = db.prepare(
      'UPDATE bookings SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    )
    updateBooking.run(status, bookingId)
    
    res.json({
      id: bookingId,
      status,
      message: `Booking ${status} successfully`
    })
  } catch (err) {
    console.error('Update booking error', err)
    res.status(500).json({ error: 'Failed to update booking' })
  }
})

app.listen(port, host, () => {
  console.log(`Nyumba Freshi backend running on http://${host}:${port}`)
})

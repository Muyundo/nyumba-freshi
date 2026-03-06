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

app.get('/api/dbtime', async (req, res) => {
  try {
    const result = await db.query("SELECT NOW() as now")
    res.json({ now: result.rows[0].now })
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
    const result = await db.query(
      'SELECT id, role, first_name, last_name, phone, password_hash FROM users WHERE role = $1 AND phone = $2 LIMIT 1',
      [role, normalizedPhone]
    )
    const user = result.rows[0]

    if (!user) return res.status(401).json({ error: 'Invalid credentials' })

    const isMatch = await bcrypt.compare(password, user.password_hash)
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' })

    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim()
    const token = signToken({ userId: user.id, role: user.role, firstName: user.first_name, lastName: user.last_name })
    return res.json({
      token,
      user: {
        userId: user.id,
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name,
        fullName: fullName,
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
    firstName,
    lastName,
    phone,
    location,
    estate,
    password,
    idNumber,
    servicesOffered,
    availability,
  } = req.body || {}

  if (!firstName || !lastName || !phone || !password) return res.status(400).json({ error: 'firstName, lastName, phone and password required' })

  try {
    const passwordHash = await bcrypt.hash(password, 10)
    const normalizedPhone = normalizePhone(phone)

    const existingUserResult = await db.query(
      'SELECT id FROM users WHERE role = $1 AND phone = $2 LIMIT 1',
      [role, normalizedPhone]
    )

    if (existingUserResult.rows.length > 0) {
      return res.status(409).json({ error: 'A user with this role and phone already exists' })
    }

    // Start transaction
    const client = await db.connect()
    try {
      await client.query('BEGIN')

      // Insert user
      const userResult = await client.query(
        'INSERT INTO users (role, first_name, last_name, phone, password_hash, location, estate) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
        [role, firstName, lastName, normalizedPhone, passwordHash, location || null, estate || null]
      )
      const userId = userResult.rows[0].id

      if (role === 'Worker') {
        // Insert worker profile
        const profileResult = await client.query(
          'INSERT INTO worker_profiles (user_id, id_number, availability) VALUES ($1, $2, $3) RETURNING id',
          [userId, idNumber || null, availability || null]
        )
        const profileId = profileResult.rows[0].id

        // Insert services
        if (Array.isArray(servicesOffered)) {
          for (const service of servicesOffered) {
            await client.query(
              'INSERT INTO worker_services (worker_profile_id, service) VALUES ($1, $2)',
              [profileId, service]
            )
          }
        }
      }

      await client.query('COMMIT')

      return res.status(201).json({
        message: 'Registered successfully. Please login.',
        user: {
          userId,
          role,
          firstName,
          lastName,
          phone: normalizedPhone,
        },
      })
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  } catch (err) {
    console.error('Registration error', err)
    return res.status(500).json({ error: 'Registration error' })
  }
})

// Protected demo route
app.get('/api/protected', verifyTokenMiddleware, async (req, res) => {
  const name = req.user.firstName ? `${req.user.firstName} ${req.user.lastName || ''}`.trim() : req.user.username || 'User'
  res.json({ message: `Hello ${name}`, user: req.user })
})

// Get all workers with their services
app.get('/api/workers', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.phone,
        u.location,
        u.estate,
        wp.id as profile_id,
        STRING_AGG(ws.service, ',') as services
      FROM users u
      LEFT JOIN worker_profiles wp ON u.id = wp.user_id
      LEFT JOIN worker_services ws ON wp.id = ws.worker_profile_id
      WHERE u.role = 'Worker'
      GROUP BY u.id, wp.id
      ORDER BY u.id
    `)
    
    const workers = result.rows.map(w => ({
      id: w.id,
      firstName: w.first_name,
      lastName: w.last_name,
      fullName: `${w.first_name || ''} ${w.last_name || ''}`.trim(),
      phone: w.phone,
      location: w.location,
      estate: w.estate,
      services: w.services ? w.services.split(',').filter(s => s) : []
    }))
    
    res.json(workers)
  } catch (err) {
    console.error('Get workers error', err)
    res.status(500).json({ error: 'Failed to fetch workers' })
  }
})

// Get single worker details
app.get('/api/workers/:id', async (req, res) => {
  try {
    const { id } = req.params
    const result = await db.query(`
      SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.phone,
        u.location,
        u.estate,
        wp.id as profile_id,
        wp.id_number,
        wp.availability,
        STRING_AGG(ws.service, ',') as services
      FROM users u
      LEFT JOIN worker_profiles wp ON u.id = wp.user_id
      LEFT JOIN worker_services ws ON wp.id = ws.worker_profile_id
      WHERE u.role = 'Worker' AND u.id = $1
      GROUP BY u.id, wp.id
    `, [id])
    
    const worker = result.rows[0]
    
    if (!worker) {
      return res.status(404).json({ error: 'Worker not found' })
    }
    
    res.json({
      id: worker.id,
      firstName: worker.first_name,
      lastName: worker.last_name,
      fullName: `${worker.first_name || ''} ${worker.last_name || ''}`.trim(),
      phone: worker.phone,
      location: worker.location,
      estate: worker.estate,
      idNumber: worker.id_number,
      availability: worker.availability,
      services: worker.services ? worker.services.split(',').filter(s => s) : []
    })
  } catch (err) {
    console.error('Get worker error', err)
    res.status(500).json({ error: 'Failed to fetch worker' })
  }
})

// Create a booking
app.post('/api/bookings', verifyTokenMiddleware, async (req, res) => {
  const { workerId, service, bookingDate, notes } = req.body || {}
  const homeownerId = req.user.userId

  if (!workerId || !service || !bookingDate) {
    return res.status(400).json({ error: 'workerId, service, and bookingDate are required' })
  }

  try {
    const result = await db.query(
      'INSERT INTO bookings (homeowner_id, worker_id, service, booking_date, notes, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [homeownerId, workerId, service, bookingDate, notes || '', 'pending']
    )
    
    res.status(201).json({
      id: result.rows[0].id,
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
app.get('/api/homeowners/:homeownerId/bookings', verifyTokenMiddleware, async (req, res) => {
  const { homeownerId } = req.params
  const requesterId = String(req.user.userId)

  if (requesterId !== String(homeownerId)) {
    return res.status(403).json({ error: 'Not authorized to view these bookings' })
  }

  try {
    const result = await db.query(`
      SELECT
        b.id,
        b.homeowner_id,
        b.worker_id,
        b.service,
        b.booking_date,
        b.notes,
        b.status,
        b.created_at,
        u.first_name as worker_first_name,
        u.last_name as worker_last_name,
        u.phone as worker_phone
      FROM bookings b
      LEFT JOIN users u ON b.worker_id = u.id
      WHERE b.homeowner_id = $1
      ORDER BY b.created_at DESC
    `, [homeownerId])

    const bookings = result.rows.map((b) => ({
      id: b.id,
      homeownerId: b.homeowner_id,
      workerId: b.worker_id,
      service: b.service,
      bookingDate: b.booking_date,
      notes: b.notes,
      status: b.status,
      createdAt: b.created_at,
      workerName: `${b.worker_first_name || ''} ${b.worker_last_name || ''}`.trim(),
      workerPhone: b.worker_phone,
    }))

    return res.json(bookings)
  } catch (err) {
    console.error('Get homeowner bookings error', err)
    return res.status(500).json({ error: 'Failed to fetch homeowner bookings' })
  }
})

// Get bookings for a worker
app.get('/api/workers/:workerId/bookings', verifyTokenMiddleware, async (req, res) => {
  const { workerId } = req.params
  const requesterId = String(req.user.userId)

  if (requesterId !== String(workerId)) {
    return res.status(403).json({ error: 'Not authorized to view these bookings' })
  }

  try {
    const result = await db.query(`
      SELECT 
        b.id,
        b.homeowner_id,
        b.worker_id,
        b.service,
        b.booking_date,
        b.notes,
        b.status,
        b.created_at,
        u.first_name as homeowner_first_name,
        u.last_name as homeowner_last_name,
        u.phone as homeowner_phone
      FROM bookings b
      LEFT JOIN users u ON b.homeowner_id = u.id
      WHERE b.worker_id = $1
      ORDER BY b.created_at DESC
    `, [workerId])
    
    const bookings = result.rows.map(b => ({
      id: b.id,
      homeownerId: b.homeowner_id,
      workerId: b.worker_id,
      service: b.service,
      bookingDate: b.booking_date,
      notes: b.notes,
      status: b.status,
      createdAt: b.created_at,
      homeownerName: `${b.homeowner_first_name || ''} ${b.homeowner_last_name || ''}`.trim(),
      homeownerPhone: b.homeowner_phone
    }))
    
    res.json(bookings)
  } catch (err) {
    console.error('Get worker bookings error', err)
    res.status(500).json({ error: 'Failed to fetch bookings' })
  }
})

// Accept, decline, or cancel a booking
app.patch('/api/bookings/:bookingId', verifyTokenMiddleware, async (req, res) => {
  const { bookingId } = req.params
  const { status } = req.body || {}
  const workerId = req.user.userId

  if (!status || !['accepted', 'declined', 'cancelled'].includes(status)) {
    return res.status(400).json({ error: 'status must be accepted, declined, or cancelled' })
  }

  try {
    const bookingResult = await db.query('SELECT * FROM bookings WHERE id = $1 AND worker_id = $2', [bookingId, workerId])
    
    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found or not authorized' })
    }

    await db.query(
      'UPDATE bookings SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [status, bookingId]
    )
    
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

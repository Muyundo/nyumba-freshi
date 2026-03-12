require('dotenv').config()
const express = require('express')
const cors = require('cors')
const db = require('./db')
const bcrypt = require('bcryptjs')
const { signToken, signPasswordResetToken, verifyPasswordResetToken, verifyTokenMiddleware } = require('./auth')

const app = express()
const port = process.env.PORT || 4000
const host = process.env.HOST || '0.0.0.0'
const MAX_FORGOT_PASSWORD_ATTEMPTS = 5
const FORGOT_PASSWORD_LOCK_MS = 30 * 60 * 1000
const forgotPasswordAttempts = new Map()

app.use(cors())
app.use(express.json())

function normalizePhone(phone) {
  return String(phone || '').replace(/\D/g, '')
}

function isValidPhone(phone) {
  return /^(07|01)\d{8}$/.test(normalizePhone(phone))
}

function normalizeIdNumber(value) {
  return String(value || '').replace(/\D/g, '')
}

function isValidIdNumber(value) {
  return /^\d{7,9}$/.test(normalizeIdNumber(value))
}

function isValidBookingDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || '').trim())
}

function isValidBookingTime(value) {
  return /^\d{2}:\d{2}$/.test(String(value || '').trim())
}

function isWholeHourBookingTime(value) {
  return /^\d{2}:00$/.test(String(value || '').trim())
}

function timeToMinutes(value) {
  const [hours, minutes] = String(value || '').split(':').map((part) => Number(part))
  return (hours * 60) + minutes
}

function timesOverlapWithinOneHour(timeA, timeB) {
  return Math.abs(timeToMinutes(timeA) - timeToMinutes(timeB)) < 60
}

function getConflictingTimesForOneHourSlot(requestedTime, existingTimes) {
  return (existingTimes || []).filter((existingTime) => timesOverlapWithinOneHour(requestedTime, existingTime))
}

async function getAcceptedTimesForWorkerDate(workerId, bookingDate) {
  const result = await db.query(
    `SELECT booking_time
     FROM bookings
     WHERE worker_id = $1 AND booking_date = $2 AND status = 'accepted'
     ORDER BY booking_time ASC`,
    [workerId, bookingDate]
  )

  return result.rows.map((row) => String(row.booking_time || '').trim()).filter(Boolean)
}

async function getWorkingTimesForWorkerDate(workerId, bookingDate) {
  const result = await db.query(
    `SELECT booking_time
     FROM bookings
     WHERE worker_id = $1 AND booking_date = $2 AND status = 'in-progress'
     ORDER BY booking_time ASC`,
    [workerId, bookingDate]
  )

  return result.rows.map((row) => String(row.booking_time || '').trim()).filter(Boolean)
}

async function getAllUnavailableTimesForWorkerDate(workerId, bookingDate) {
  const acceptedTimes = await getAcceptedTimesForWorkerDate(workerId, bookingDate)
  const workingTimes = await getWorkingTimesForWorkerDate(workerId, bookingDate)
  return [...acceptedTimes, ...workingTimes]
}

async function getWorkerCurrentStatus(workerId) {
  const today = new Date().toISOString().split('T')[0]
  const result = await db.query(
    `SELECT id, service, booking_time, booking_date
     FROM bookings
     WHERE worker_id = $1 AND booking_date = $2 AND status = 'in-progress'
     LIMIT 1`,
    [workerId, today]
  )
  
  if (result.rows.length > 0) {
    const booking = result.rows[0]
    return {
      isWorking: true,
      currentJobId: booking.id,
      service: booking.service,
      time: booking.booking_time,
      date: booking.booking_date,
    }
  }
  
  return { isWorking: false }
}

function getForgotPasswordAttemptKey(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()
  return forwarded || req.ip || 'unknown'
}

function getAttemptState(key) {
  const now = Date.now()
  const current = forgotPasswordAttempts.get(key)
  if (!current) {
    return { attempts: 0, lockedUntil: null }
  }

  if (current.lockedUntil && current.lockedUntil <= now) {
    forgotPasswordAttempts.delete(key)
    return { attempts: 0, lockedUntil: null }
  }

  return current
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
    if (!isValidPhone(normalizedPhone)) {
      return res.status(400).json({ error: 'Phone must be 10 digits and start with 07 or 01' })
    }

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

app.post('/api/workers/forgot-password/verify-id', async (req, res) => {
  const { idNumber, phone } = req.body || {}
  const attemptKey = getForgotPasswordAttemptKey(req)
  const attemptState = getAttemptState(attemptKey)

  if (attemptState.lockedUntil && attemptState.lockedUntil > Date.now()) {
    return res.status(429).json({
      error: 'Maximum verification attempts reached. Please contact the system administrator.',
      attempts: MAX_FORGOT_PASSWORD_ATTEMPTS,
      maxAttempts: MAX_FORGOT_PASSWORD_ATTEMPTS,
      locked: true,
    })
  }

  const normalizedIdNumber = normalizeIdNumber(idNumber)
  if (!isValidIdNumber(normalizedIdNumber)) {
    return res.status(400).json({ error: 'Worker ID number must be digits only and between 7 and 9 numbers' })
  }

  const normalizedPhone = normalizePhone(phone)
  if (!isValidPhone(normalizedPhone)) {
    return res.status(400).json({ error: 'Phone must be 10 digits and start with 07 or 01' })
  }

  try {
    const result = await db.query(
      `SELECT u.id
       FROM users u
       INNER JOIN worker_profiles wp ON wp.user_id = u.id
       WHERE u.role = 'Worker' AND wp.id_number = $1 AND u.phone = $2
       LIMIT 1`,
      [normalizedIdNumber, normalizedPhone]
    )

    const worker = result.rows[0]

    if (!worker) {
      const nextAttempts = attemptState.attempts + 1
      const reachedMax = nextAttempts >= MAX_FORGOT_PASSWORD_ATTEMPTS

      forgotPasswordAttempts.set(attemptKey, {
        attempts: nextAttempts,
        lockedUntil: reachedMax ? Date.now() + FORGOT_PASSWORD_LOCK_MS : null,
      })

      if (reachedMax) {
        return res.status(429).json({
          error: `Attempt ${nextAttempts} of ${MAX_FORGOT_PASSWORD_ATTEMPTS}. Maximum verification attempts reached. Please contact the system administrator.`,
          attempts: nextAttempts,
          maxAttempts: MAX_FORGOT_PASSWORD_ATTEMPTS,
          locked: true,
        })
      }

      return res.status(404).json({
        error: `Your ID Number or Phone Number is incorrect. Please check and try again or Contact the system administrator. Attempt ${nextAttempts} of ${MAX_FORGOT_PASSWORD_ATTEMPTS}.`,
        attempts: nextAttempts,
        maxAttempts: MAX_FORGOT_PASSWORD_ATTEMPTS,
        locked: false,
      })
    }

    forgotPasswordAttempts.delete(attemptKey)

    const resetToken = signPasswordResetToken({ userId: worker.id, role: 'Worker', action: 'password_reset' })
    return res.json({ message: 'ID number and phone number verified', resetToken })
  } catch (err) {
    console.error('Verify worker ID and phone for password reset error', err)
    return res.status(500).json({ error: 'Failed to verify credentials' })
  }
})

app.post('/api/workers/forgot-password/reset', async (req, res) => {
  const { resetToken, newPassword } = req.body || {}

  if (!resetToken || !newPassword) {
    return res.status(400).json({ error: 'resetToken and newPassword are required' })
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters long' })
  }

  try {
    const decoded = verifyPasswordResetToken(resetToken)
    if (!decoded || decoded.action !== 'password_reset' || decoded.role !== 'Worker') {
      return res.status(401).json({ error: 'Invalid or expired reset token' })
    }

    const passwordHash = await bcrypt.hash(newPassword, 10)

    const updateResult = await db.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2 AND role = $3 RETURNING id',
      [passwordHash, decoded.userId, 'Worker']
    )

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ error: 'Worker not found' })
    }

    return res.json({ message: 'Password reset successful. Please log in with your new password.' })
  } catch (err) {
    if (err && err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Reset session expired. Please verify your ID number again.' })
    }
    if (err && err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid or expired reset token' })
    }
    console.error('Reset worker password error', err)
    return res.status(500).json({ error: 'Failed to reset password' })
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

    if (!isValidPhone(normalizedPhone)) {
      return res.status(400).json({ error: 'Phone must be 10 digits and start with 07 or 01' })
    }

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
        const normalizedIdNumber = normalizeIdNumber(idNumber)
        if (!isValidIdNumber(normalizedIdNumber)) {
          return res.status(400).json({ error: 'Worker ID number must be digits only and between 7 and 9 numbers' })
        }

        // Insert worker profile
        const profileResult = await client.query(
          'INSERT INTO worker_profiles (user_id, id_number, availability) VALUES ($1, $2, $3) RETURNING id',
          [userId, normalizedIdNumber, availability || null]
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
    
    const workers = await Promise.all(
      result.rows.map(async (w) => {
        const currentStatus = await getWorkerCurrentStatus(w.id)
        return {
          id: w.id,
          firstName: w.first_name,
          lastName: w.last_name,
          fullName: `${w.first_name || ''} ${w.last_name || ''}`.trim(),
          phone: w.phone,
          location: w.location,
          estate: w.estate,
          services: w.services ? w.services.split(',').filter(s => s) : [],
          currentStatus,
        }
      })
    )
    
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
    
    const currentStatus = await getWorkerCurrentStatus(id)
    
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
      services: worker.services ? worker.services.split(',').filter(s => s) : [],
      currentStatus,
    })
  } catch (err) {
    console.error('Get worker error', err)
    res.status(500).json({ error: 'Failed to fetch worker' })
  }
})

// Get accepted schedule for a worker on a specific date
app.get('/api/workers/:workerId/availability', verifyTokenMiddleware, async (req, res) => {
  const { workerId } = req.params
  const date = String(req.query.date || '').trim()

  if (!date) {
    return res.status(400).json({ error: 'date query parameter is required (YYYY-MM-DD)' })
  }

  if (!isValidBookingDate(date)) {
    return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' })
  }

  try {
    const unavailableTimes = await getAllUnavailableTimesForWorkerDate(workerId, date)
    return res.json({ workerId: Number(workerId), date, bookedTimes: unavailableTimes })
  } catch (err) {
    console.error('Get worker availability error', err)
    return res.status(500).json({ error: 'Failed to fetch worker availability' })
  }
})

// Create a booking
app.post('/api/bookings', verifyTokenMiddleware, async (req, res) => {
  const { workerId, service, bookingDate, bookingTime, notes } = req.body || {}
  const homeownerId = req.user.userId

  if (!workerId || !service || !bookingDate) {
    return res.status(400).json({ error: 'workerId, service, and bookingDate are required' })
  }

  if (!bookingTime) {
    return res.status(400).json({ error: 'bookingTime is required' })
  }

  const normalizedBookingDate = String(bookingDate).trim()
  const normalizedBookingTime = String(bookingTime).trim()
  const isValidDateFormat = isValidBookingDate(normalizedBookingDate)
  const isValidTimeFormat = isValidBookingTime(normalizedBookingTime)

  if (!isValidDateFormat || !isValidTimeFormat) {
    return res.status(400).json({ error: 'Invalid booking date or time format' })
  }

  if (!isWholeHourBookingTime(normalizedBookingTime)) {
    return res.status(400).json({ error: 'Please book time in full hours e.g 7:00, 8:00' })
  }

  const bookingDateTime = new Date(`${normalizedBookingDate}T${normalizedBookingTime}:00`)
  const now = new Date()
  now.setSeconds(0, 0)

  if (Number.isNaN(bookingDateTime.getTime())) {
    return res.status(400).json({ error: 'Invalid booking date or time' })
  }

  if (bookingDateTime < now) {
    return res.status(400).json({ error: 'Booking date and time cannot be in the past' })
  }

  try {
    const unavailableTimes = await getAllUnavailableTimesForWorkerDate(workerId, normalizedBookingDate)
    const conflictingTimes = getConflictingTimesForOneHourSlot(normalizedBookingTime, unavailableTimes)
    if (conflictingTimes.length > 0) {
      return res.status(409).json({
        error: 'This worker is unavailable at this time (already booked or working).',
        date: normalizedBookingDate,
        bookedTimes: conflictingTimes,
      })
    }

    const result = await db.query(
      'INSERT INTO bookings (homeowner_id, worker_id, service, booking_date, booking_time, notes, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
      [homeownerId, workerId, service, normalizedBookingDate, normalizedBookingTime, notes || '', 'pending']
    )
    
    res.status(201).json({
      id: result.rows[0].id,
      homeownerId,
      workerId,
      service,
      bookingDate: normalizedBookingDate,
      bookingTime: normalizedBookingTime,
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
        b.booking_time,
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
      bookingTime: b.booking_time,
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
        b.booking_time,
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
      bookingTime: b.booking_time,
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

// Accept, decline, start, complete, or cancel a booking
app.patch('/api/bookings/:bookingId', verifyTokenMiddleware, async (req, res) => {
  const { bookingId } = req.params
  const { status } = req.body || {}
  const requesterId = req.user.userId
  const requesterRole = String(req.user.role || '').toLowerCase().trim()

  if (!status || !['accepted', 'declined', 'cancelled', 'in-progress', 'completed'].includes(status)) {
    return res.status(400).json({ error: 'status must be accepted, declined, cancelled, in-progress, or completed' })
  }

  try {
    const bookingResult = await db.query('SELECT * FROM bookings WHERE id = $1', [bookingId])
    
    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' })
    }

    const booking = bookingResult.rows[0]
    const normalizedCurrentStatus = String(booking.status || '').toLowerCase().trim()

    if (requesterRole === 'worker') {
      if (String(booking.worker_id) !== String(requesterId)) {
        return res.status(403).json({ error: 'Not authorized to update this booking' })
      }

      if (status === 'accepted') {
        const unavailableTimes = await getAllUnavailableTimesForWorkerDate(booking.worker_id, booking.booking_date)
        const targetBookingTime = String(booking.booking_time || '').trim()
        const conflictingTimes = getConflictingTimesForOneHourSlot(targetBookingTime, unavailableTimes)
        const hasConflict = conflictingTimes.length > 0 && normalizedCurrentStatus !== 'accepted'

        if (hasConflict) {
          return res.status(409).json({
            error: 'Cannot accept booking because this worker is already booked or working at this time.',
            date: booking.booking_date,
            bookedTimes: conflictingTimes,
          })
        }
      } else if (status === 'in-progress') {
        if (normalizedCurrentStatus !== 'accepted') {
          return res.status(400).json({ error: 'Only accepted bookings can be started' })
        }

        // Check if worker is already working on another job
        const existingInProgressResult = await db.query(
          `SELECT id FROM bookings 
           WHERE worker_id = $1 AND status = 'in-progress' AND id != $2 
           LIMIT 1`,
          [booking.worker_id, bookingId]
        )

        if (existingInProgressResult.rows.length > 0) {
          return res.status(400).json({ 
            error: 'You are currently working on another job. Please complete that job first before starting a new one.' 
          })
        }
      } else if (status === 'completed') {
        if (normalizedCurrentStatus !== 'in-progress') {
          return res.status(400).json({ error: 'Only in-progress bookings can be completed' })
        }
      } else if (status !== 'declined') {
        return res.status(403).json({ error: 'Workers can only accept, decline, start, or complete bookings' })
      }
    } else if (requesterRole === 'homeowner') {
      if (String(booking.homeowner_id) !== String(requesterId)) {
        return res.status(403).json({ error: 'Not authorized to update this booking' })
      }

      if (status !== 'cancelled') {
        return res.status(403).json({ error: 'Homeowners can only cancel bookings' })
      }

      if (normalizedCurrentStatus !== 'pending') {
        return res.status(400).json({ error: 'Only pending bookings can be cancelled by homeowners' })
      }
    } else {
      return res.status(403).json({ error: 'Not authorized to update bookings' })
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

// Change password endpoint (protected)
app.post('/api/change-password', verifyTokenMiddleware, async (req, res) => {
  const { oldPassword, newPassword } = req.body || {}
  const userId = req.user.userId

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: 'oldPassword and newPassword are required' })
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters long' })
  }

  try {
    // Get current user password hash
    const result = await db.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    const currentPasswordHash = result.rows[0].password_hash

    // Verify old password
    const isMatch = await bcrypt.compare(oldPassword, currentPasswordHash)
    if (!isMatch) {
      return res.status(401).json({ error: 'Current password is incorrect' })
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10)

    // Update password
    await db.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [newPasswordHash, userId]
    )

    res.json({ message: 'Password changed successfully' })
  } catch (err) {
    console.error('Change password error', err)
    res.status(500).json({ error: 'Failed to change password' })
  }
})

app.listen(port, host, () => {
  console.log(`Nyumba Freshi backend running on http://${host}:${port}`)
})

const { Pool } = require('pg')

// PostgreSQL connection pool
// Uses DATABASE_URL from environment (automatically set by Railway)
// For local dev, set in .env file
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/nyumba_freshi',
})

console.log('PostgreSQL connection pool initialized')

// Initialize database schema
async function initializeDatabase() {
  try {
    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        role TEXT,
        full_name TEXT,
        phone TEXT,
        password_hash TEXT,
        location TEXT,
        estate TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create worker_profiles table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS worker_profiles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        id_number TEXT,
        availability TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `)

    // Create worker_services table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS worker_services (
        id SERIAL PRIMARY KEY,
        worker_profile_id INTEGER,
        service TEXT,
        FOREIGN KEY (worker_profile_id) REFERENCES worker_profiles(id) ON DELETE CASCADE
      )
    `)

    // Create bookings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        homeowner_id INTEGER,
        worker_id INTEGER,
        service TEXT,
        booking_date TEXT,
        notes TEXT,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (homeowner_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (worker_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `)

    console.log('PostgreSQL tables initialized successfully')
  } catch (err) {
    console.error('Error initializing database:', err.message)
    throw err
  }
}

// Initialize on module load
initializeDatabase()

module.exports = pool

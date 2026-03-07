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
  // Retry logic for database connection
  const maxRetries = 5
  const retryDelay = 3000 // 3 seconds
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempting to connect to PostgreSQL (attempt ${attempt}/${maxRetries})...`)
      
      // Test connection first
      await pool.query('SELECT NOW()')
      console.log('✓ PostgreSQL connection established')
      
      // Create users table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          role TEXT,
          first_name TEXT,
          last_name TEXT,
          phone TEXT,
          password_hash TEXT,
          location TEXT,
          estate TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `)

      // Ensure name columns exist on older databases created with full_name only.
      await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name TEXT')
      await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name TEXT')

      const fullNameColumnCheck = await pool.query(`
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'users' AND column_name = 'full_name'
        ) AS has_full_name
      `)

      if (fullNameColumnCheck.rows[0].has_full_name) {
        await pool.query(`
          UPDATE users
          SET
            first_name = COALESCE(NULLIF(first_name, ''), split_part(trim(full_name), ' ', 1)),
            last_name = COALESCE(
              NULLIF(last_name, ''),
              NULLIF(trim(substring(trim(full_name) FROM '^\\S+\\s*(.*)$')), '')
            )
          WHERE full_name IS NOT NULL AND trim(full_name) <> ''
        `)
        console.log('✓ Name columns synced from full_name where needed')
      }

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
          booking_time TEXT,
          notes TEXT,
          status TEXT DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (homeowner_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (worker_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `)

      // Migrate: Add booking_time column if it doesn't exist
      await pool.query(`
        ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_time TEXT
      `)

      console.log('✓ PostgreSQL tables initialized successfully')
      return // Success - exit the retry loop
      
    } catch (err) {
      console.error(`Error initializing database (attempt ${attempt}/${maxRetries}):`, err.message)
      
      if (attempt === maxRetries) {
        console.error('❌ Failed to connect to PostgreSQL after maximum retries')
        console.error('Please ensure:')
        console.error('  1. PostgreSQL service is added to your Railway project')
        console.error('  2. DATABASE_URL environment variable is set')
        console.error('  3. PostgreSQL service is running')
        throw err
      }
      
      // Wait before retrying
      console.log(`Retrying in ${retryDelay / 1000} seconds...`)
      await new Promise(resolve => setTimeout(resolve, retryDelay))
    }
  }
}

// Initialize on module load
initializeDatabase()

module.exports = pool

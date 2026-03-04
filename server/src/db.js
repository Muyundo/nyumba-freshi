const Database = require('better-sqlite3')
const path = require('path')

// Create or open SQLite database
const dbPath = path.join(__dirname, '..', 'nyumba_freshi.db')
const db = new Database(dbPath)

console.log(`SQLite database initialized at: ${dbPath}`)

// Create tables if they don't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role TEXT,
    full_name TEXT,
    phone TEXT,
    password_hash TEXT,
    location TEXT,
    estate TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`)

db.exec(`
  CREATE TABLE IF NOT EXISTS worker_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    id_number TEXT,
    availability TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`)

db.exec(`
  CREATE TABLE IF NOT EXISTS worker_services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    worker_profile_id INTEGER,
    service TEXT,
    FOREIGN KEY (worker_profile_id) REFERENCES worker_profiles(id)
  )
`)

db.exec(`
  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    homeowner_id INTEGER,
    worker_id INTEGER,
    service TEXT,
    booking_date TEXT,
    notes TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (homeowner_id) REFERENCES users(id),
    FOREIGN KEY (worker_id) REFERENCES users(id)
  )
`)

module.exports = db

// Migration script: SQLite -> PostgreSQL
// Run this once to migrate your existing data
const Database = require('better-sqlite3')
const { Pool } = require('pg')
const path = require('path')

const sqlitePath = path.join(__dirname, '..', 'nyumba_freshi.db')
const pgConnectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres123@localhost:5432/nyumba_freshi'

async function migrate() {
  console.log('Starting migration from SQLite to PostgreSQL...\n')
  
  // Check if SQLite database exists
  const fs = require('fs')
  if (!fs.existsSync(sqlitePath)) {
    console.log('No SQLite database found at:', sqlitePath)
    console.log('Nothing to migrate. Exiting.')
    return
  }

  const sqlite = new Database(sqlitePath)
  const pg = new Pool({ connectionString: pgConnectionString })

  try {
    // Test PostgreSQL connection
    await pg.query('SELECT NOW()')
    console.log('✓ Connected to PostgreSQL')

    // Migrate users
    console.log('\nMigrating users...')
    const users = sqlite.prepare('SELECT * FROM users').all()
    for (const user of users) {
      await pg.query(
        'INSERT INTO users (id, role, full_name, phone, password_hash, location, estate, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (id) DO NOTHING',
        [user.id, user.role, user.full_name, user.phone, user.password_hash, user.location, user.estate, user.created_at]
      )
    }
    // Update sequence
    if (users.length > 0) {
      const maxId = Math.max(...users.map(u => u.id))
      await pg.query(`SELECT setval('users_id_seq', $1)`, [maxId])
    }
    console.log(`✓ Migrated ${users.length} users`)

    // Migrate worker_profiles
    console.log('\nMigrating worker profiles...')
    const profiles = sqlite.prepare('SELECT * FROM worker_profiles').all()
    for (const profile of profiles) {
      await pg.query(
        'INSERT INTO worker_profiles (id, user_id, id_number, availability, created_at) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING',
        [profile.id, profile.user_id, profile.id_number, profile.availability, profile.created_at]
      )
    }
    if (profiles.length > 0) {
      const maxId = Math.max(...profiles.map(p => p.id))
      await pg.query(`SELECT setval('worker_profiles_id_seq', $1)`, [maxId])
    }
    console.log(`✓ Migrated ${profiles.length} worker profiles`)

    // Migrate worker_services
    console.log('\nMigrating worker services...')
    const services = sqlite.prepare('SELECT * FROM worker_services').all()
    for (const service of services) {
      await pg.query(
        'INSERT INTO worker_services (id, worker_profile_id, service) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING',
        [service.id, service.worker_profile_id, service.service]
      )
    }
    if (services.length > 0) {
      const maxId = Math.max(...services.map(s => s.id))
      await pg.query(`SELECT setval('worker_services_id_seq', $1)`, [maxId])
    }
    console.log(`✓ Migrated ${services.length} worker services`)

    // Migrate bookings
    console.log('\nMigrating bookings...')
    const bookings = sqlite.prepare('SELECT * FROM bookings').all()
    for (const booking of bookings) {
      await pg.query(
        'INSERT INTO bookings (id, homeowner_id, worker_id, service, booking_date, notes, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (id) DO NOTHING',
        [booking.id, booking.homeowner_id, booking.worker_id, booking.service, booking.booking_date, booking.notes, booking.status, booking.created_at, booking.updated_at]
      )
    }
    if (bookings.length > 0) {
      const maxId = Math.max(...bookings.map(b => b.id))
      await pg.query(`SELECT setval('bookings_id_seq', $1)`, [maxId])
    }
    console.log(`✓ Migrated ${bookings.length} bookings`)

    console.log('\n✅ Migration completed successfully!')
    console.log('\nSummary:')
    console.log(`  - ${users.length} users`)
    console.log(`  - ${profiles.length} worker profiles`)
    console.log(`  - ${services.length} services`)
    console.log(`  - ${bookings.length} bookings`)

  } catch (err) {
    console.error('\n❌ Migration failed:', err.message)
    console.error(err)
    process.exit(1)
  } finally {
    sqlite.close()
    await pg.end()
  }
}

migrate()

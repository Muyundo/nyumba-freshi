// Database schema update script: full_name -> first_name, last_name
// Run this once to update existing PostgreSQL database schema
require('dotenv').config()
const { Pool } = require('pg')

const pgConnectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres123@localhost:5432/nyumba_freshi'

async function updateSchema() {
  console.log('Starting database schema update...\n')
  
  const pool = new Pool({ connectionString: pgConnectionString })

  try {
    // Test PostgreSQL connection
    await pool.query('SELECT NOW()')
    console.log('✓ Connected to PostgreSQL')

    // Check if first_name and last_name columns already exist
    const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('first_name', 'last_name', 'full_name')
    `)
    
    const existingColumns = columnCheck.rows.map(r => r.column_name)
    const hasFullName = existingColumns.includes('full_name')
    const hasFirstName = existingColumns.includes('first_name')
    const hasLastName = existingColumns.includes('last_name')

    console.log(`\nCurrent schema:`)
    console.log(`  - full_name column: ${hasFullName ? 'exists' : 'missing'}`)
    console.log(`  - first_name column: ${hasFirstName ? 'exists' : 'missing'}`)
    console.log(`  - last_name column: ${hasLastName ? 'exists' : 'missing'}`)

    if (hasFirstName && hasLastName && !hasFullName) {
      console.log('\n✓ Schema is already up to date!')
      await pool.end()
      return
    }

    // Add new columns if they don't exist
    if (!hasFirstName) {
      console.log('\nAdding first_name column...')
      await pool.query('ALTER TABLE users ADD COLUMN first_name TEXT')
      console.log('✓ first_name column added')
    }

    if (!hasLastName) {
      console.log('Adding last_name column...')
      await pool.query('ALTER TABLE users ADD COLUMN last_name TEXT')
      console.log('✓ last_name column added')
    }

    // Migrate data from full_name to first_name and last_name if full_name exists
    if (hasFullName) {
      console.log('\nMigrating data from full_name to first_name and last_name...')
      
      const users = await pool.query('SELECT id, full_name FROM users WHERE full_name IS NOT NULL')
      
      for (const user of users.rows) {
        const nameParts = (user.full_name || '').trim().split(/\s+/)
        const firstName = nameParts[0] || ''
        const lastName = nameParts.slice(1).join(' ') || ''
        
        await pool.query(
          'UPDATE users SET first_name = $1, last_name = $2 WHERE id = $3',
          [firstName, lastName, user.id]
        )
      }
      
      console.log(`✓ Migrated ${users.rows.length} user records`)

      // Drop the old full_name column
      console.log('\nDropping full_name column...')
      await pool.query('ALTER TABLE users DROP COLUMN full_name')
      console.log('✓ full_name column dropped')
    }

    console.log('\n✅ Schema update completed successfully!')
    console.log('\nNew schema:')
    console.log('  - first_name column: ✓')
    console.log('  - last_name column: ✓')

  } catch (err) {
    console.error('\n❌ Schema update failed:', err.message)
    console.error(err)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

// Run the update
updateSchema()

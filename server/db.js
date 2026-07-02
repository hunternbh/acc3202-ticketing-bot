import pg from 'pg'

const { Pool } = pg
const databaseUrl = process.env.DATABASE_URL

const pool = new Pool({
  connectionString: databaseUrl,
  ssl:
    process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false,
})

function assertDatabaseConfigured() {
  if (!databaseUrl) {
    const error = new Error('DATABASE_URL is not configured')
    error.isDatabaseError = true
    throw error
  }
}

export async function query(text, params) {
  assertDatabaseConfigured()
  return pool.query(text, params)
}

export async function getClient() {
  assertDatabaseConfigured()
  return pool.connect()
}

import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import pg from 'pg'

const expected = ['admin', ...Array.from({ length: 50 }, (_, i) => `student${i + 1}`)]
const credentials = JSON.parse(process.env.SEATGATE_ROTATION || 'null')
if (!process.env.DATABASE_URL || !credentials || Object.keys(credentials).length !== expected.length ||
    expected.some(name => typeof credentials[name] !== 'string' || credentials[name].length < 24) ||
    new Set(Object.values(credentials)).size !== expected.length) {
  throw new Error('Missing database configuration or invalid rotation payload')
}

const rows = await Promise.all(Object.entries(credentials).map(async ([name, password]) => [
  name, await bcrypt.hash(password, 10),
]))
const disabledAccountHash = await bcrypt.hash(crypto.randomBytes(32).toString('base64url'), 10)
const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
})

let transaction = false
try {
  await client.connect()
  await client.query('BEGIN')
  transaction = true
  await client.query('LOCK TABLE users IN SHARE ROW EXCLUSIVE MODE')
  const checks = await client.query('SELECT LOWER(email) AS name, is_admin FROM users WHERE LOWER(email) = ANY($1)', [expected])
  if (checks.rowCount !== expected.length || checks.rows.filter(row => row.is_admin).length !== 1 ||
      !checks.rows.some(row => row.name === 'admin' && row.is_admin)) {
    throw new Error('Expected roster or administrator role did not match')
  }
  for (const [name, hash] of rows) {
    const updated = await client.query('UPDATE users SET password_hash = $1 WHERE LOWER(email) = $2', [hash, name])
    if (updated.rowCount !== 1) throw new Error('A roster update affected an unexpected number of rows')
  }
  const auditAccount = await client.query("UPDATE users SET password_hash = $1 WHERE LOWER(email) = 'fakebuyer' AND NOT is_admin", [disabledAccountHash])
  await client.query('COMMIT')
  transaction = false
  console.log(`Rotated ${rows.length} standard logins and disabled the credential of ${auditAccount.rowCount} seeded audit account.`)
} catch (error) {
  if (transaction) await client.query('ROLLBACK').catch(() => {})
  console.error('Credential rotation failed:', error.code || (error.message.startsWith('Expected roster') ? 'roster mismatch' : error.name))
  process.exitCode = 1
} finally {
  await client.end().catch(() => {})
}

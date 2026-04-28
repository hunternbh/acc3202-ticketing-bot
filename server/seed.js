import fs from 'fs'
import bcrypt from 'bcryptjs'
import { query } from './db.js'

async function run() {
  const schema = fs.readFileSync(new URL('./schema.sql', import.meta.url), 'utf8')
  await query(schema)

  const users = [
    { email: 'student01@hunter-ticket.com', password: 'pass01', isAdmin: false },
    { email: 'student02@hunter-ticket.com', password: 'pass02', isAdmin: false },
    { email: 'student03@hunter-ticket.com', password: 'pass03', isAdmin: false },
    { email: 'student04@hunter-ticket.com', password: 'pass04', isAdmin: false },
    { email: 'student05@hunter-ticket.com', password: 'pass05', isAdmin: false },
    { email: 'admin@hunter-ticket.com', password: 'adminpass', isAdmin: true },
  ]

  for (const user of users) {
    const passwordHash = await bcrypt.hash(user.password, 10)

    await query(
      `
      INSERT INTO users (email, password_hash, wallet_balance, is_admin)
      VALUES ($1, $2, $3, $4)
      `,
      [user.email, passwordHash, 5.0, user.isAdmin]
    )
  }

  const events = [
    [1, 'Hunter X One', 'Audit Control Theatre', 'Friday, Apr 25, 2026', 'hunter-1.png'],
    [2, 'Hunter X Two', 'Revenue Recognition Hall', 'Friday, Apr 25, 2026', 'hunter-2.png'],
    [3, 'Hunter X Three', 'Bot Detection Center', 'Friday, Apr 25, 2026', 'hunter-3.png'],
    [4, 'Hunter X Four', 'Central Park Carousel', 'Friday, Apr 25, 2026', 'hunter-4.png'],
    [5, 'Hunter X Five', 'ACC3202 Classroom Simulation', 'Friday, Apr 25, 2026', 'hunter-5.png'],
  ]

  for (const event of events) {
    await query(
      `
      INSERT INTO events (id, title, venue, event_date, image)
      VALUES ($1, $2, $3, $4, $5)
      `,
      event
    )
  }

  for (const event of events) {
  const eventId = event[0]

  const price = eventId === 1 ? 0.00 : 1.00

  await query(
    `
    INSERT INTO ticket_types
      (event_id, name, price, total_quantity, released_quantity, sold_quantity, is_released)
    VALUES
      ($1, 'Early Bird Ticket', $2, 0, 0, 0, TRUE),
      ($1, 'Pre-General Ticket', $2, 0, 0, 0, FALSE),
      ($1, 'General Admission Ticket', $2, 0, 0, 0, FALSE)
    `,
    [eventId, price]
  )
}

  console.log('Database seeded successfully.')
  process.exit(0)
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
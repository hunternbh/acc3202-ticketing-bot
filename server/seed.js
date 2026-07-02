import fs from 'fs'
import bcrypt from 'bcryptjs'
import { query } from './db.js'

async function run() {
  const schema = fs.readFileSync(new URL('./schema.sql', import.meta.url), 'utf8')
  await query(schema)

  const users = [
    { email: 'student01@seatgate-ticket.com', password: 'pass01', isAdmin: false },
    { email: 'student02@seatgate-ticket.com', password: 'pass02', isAdmin: false },
    { email: 'student03@seatgate-ticket.com', password: 'pass03', isAdmin: false },
    { email: 'student04@seatgate-ticket.com', password: 'pass04', isAdmin: false },
    { email: 'student05@seatgate-ticket.com', password: 'pass05', isAdmin: false },
    { email: 'admin@seatgate-ticket.com', password: 'adminpass', isAdmin: true },
    {
      email: 'fake-main-buyer@seatgate-ticket.com',
      password: 'fakepass',
      walletBalance: 79.0,
      isAdmin: false,
    },
  ]

  for (const user of users) {
    const passwordHash = await bcrypt.hash(user.password, 10)

    await query(
      `
      INSERT INTO users (email, password_hash, wallet_balance, is_admin)
      VALUES ($1, $2, $3, $4)
      `,
      [user.email, passwordHash, user.walletBalance ?? 5.0, user.isAdmin]
    )
  }

  const events = [
    [1, 'SeatGate X Trial', 'Audit Control Theatre', 'Friday, Apr 25, 2026', 'seatgate-trial.png'],
    [2, 'SeatGate X Main', 'Revenue Recognition Hall', 'Friday, Apr 25, 2026', 'seatgate-main.png'],
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
        ($1, 'Main Tickets', $2, 99999, 99999, 0, TRUE)
      `,
      [eventId, price]
    )
  }

  const fakePurchaseResult = await query(
    `
    INSERT INTO purchases (user_id, event_id, total_amount, status, ip_address, user_agent)
    SELECT id, 2, 20.00, 'SUCCESS', 'seed', 'database seed'
    FROM users
    WHERE email = 'fake-main-buyer@seatgate-ticket.com'
    RETURNING id
    `
  )

  const fakePurchase = fakePurchaseResult.rows[0]

  await query(
    `
    INSERT INTO purchase_items (purchase_id, ticket_type_id, quantity, unit_price)
    SELECT $1, id, 20, price
    FROM ticket_types
    WHERE event_id = 2
      AND name = 'Main Tickets'
    `,
    [fakePurchase.id]
  )

  await query(
    `
    UPDATE ticket_types
    SET sold_quantity = sold_quantity + 20
    WHERE event_id = 2
      AND name = 'Main Tickets'
    `
  )

  console.log('Database seeded successfully.')
  process.exit(0)
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})

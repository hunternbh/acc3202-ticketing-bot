import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { query, getClient } from './db.js'
import fs from 'fs'

const app = express()

app.use(cors({
  origin: 'https://hunternbh.github.io',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-seed-secret'],
}))

app.use(express.json())

const PORT = process.env.PORT || 10000
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-this'

function createToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      isAdmin: user.is_admin,
    },
    JWT_SECRET,
    { expiresIn: '8h' }
  )
}

function authRequired(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null

  if (!token) {
    return res.status(401).json({ error: 'Missing token' })
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET)
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

function adminRequired(req, res, next) {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' })
  }

  next()
}

app.get('/api/my-holdings', authRequired, async (req, res) => {
  const userResult = await query(
    `
    SELECT id, email, wallet_balance
    FROM users
    WHERE id = $1
    `,
    [req.user.id]
  )

  const user = userResult.rows[0]

  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }

  const holdingsResult = await query(
    `
    SELECT
      purchases.id AS purchase_id,
      purchases.created_at,
      events.id AS event_id,
      events.title AS event_title,
      events.venue AS event_venue,
      events.event_date,
      ticket_types.name AS ticket_type,
      purchase_items.quantity,
      purchase_items.unit_price,
      purchase_items.quantity * purchase_items.unit_price AS subtotal
    FROM purchases
    JOIN purchase_items
      ON purchase_items.purchase_id = purchases.id
    JOIN ticket_types
      ON ticket_types.id = purchase_items.ticket_type_id
    JOIN events
      ON events.id = purchases.event_id
    WHERE purchases.user_id = $1
      AND purchases.status = 'SUCCESS'
    ORDER BY purchases.created_at DESC
    `,
    [req.user.id]
  )

  res.json({
    user: {
      id: user.id,
      email: user.email,
      walletBalance: Number(user.wallet_balance),
    },
    holdings: holdingsResult.rows.map((row) => ({
      purchaseId: row.purchase_id,
      createdAt: row.created_at,
      eventId: row.event_id,
      eventTitle: row.event_title,
      eventVenue: row.event_venue,
      eventDate: row.event_date,
      ticketType: row.ticket_type,
      quantity: Number(row.quantity),
      unitPrice: Number(row.unit_price),
      subtotal: Number(row.subtotal),
    })),
  })
})

async function writeAuditLog({
  userId = null,
  action,
  eventId = null,
  ticketTypeId = null,
  success,
  metadata = {},
}) {
  await query(
    `
    INSERT INTO audit_logs
      (user_id, action, event_id, ticket_type_id, success, metadata)
    VALUES
      ($1, $2, $3, $4, $5, $6)
    `,
    [userId, action, eventId, ticketTypeId, success, metadata]
  )
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'acc3202-ticketing-api' })
})

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' })
  }

  const result = await query(
    `
    SELECT id, email, password_hash, wallet_balance, is_admin
    FROM users
    WHERE LOWER(email) = LOWER($1)
    `,
    [email]
  )

  const user = result.rows[0]

  if (!user) {
    await writeAuditLog({
      action: 'LOGIN_FAILED',
      success: false,
      metadata: { email, reason: 'unknown_email' },
    })

    return res.status(401).json({ error: 'Invalid email or password' })
  }

  const ok = await bcrypt.compare(password, user.password_hash)

  if (!ok) {
    await writeAuditLog({
      userId: user.id,
      action: 'LOGIN_FAILED',
      success: false,
      metadata: { email, reason: 'bad_password' },
    })

    return res.status(401).json({ error: 'Invalid email or password' })
  }

  await writeAuditLog({
    userId: user.id,
    action: 'LOGIN_SUCCESS',
    success: true,
    metadata: { email },
  })

  const token = createToken(user)

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      walletBalance: Number(user.wallet_balance),
      isAdmin: user.is_admin,
    },
  })
})

app.get('/api/me', authRequired, async (req, res) => {
  const result = await query(
    `
    SELECT id, email, wallet_balance, is_admin
    FROM users
    WHERE id = $1
    `,
    [req.user.id]
  )

  const user = result.rows[0]

  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }

  res.json({
    id: user.id,
    email: user.email,
    walletBalance: Number(user.wallet_balance),
    isAdmin: user.is_admin,
  })
})

app.get('/api/events/:eventId/tickets', async (req, res) => {
  const eventId = Number(req.params.eventId)

  const eventResult = await query(
    `
    SELECT id, title, venue, event_date, image
    FROM events
    WHERE id = $1
    `,
    [eventId]
  )

  const event = eventResult.rows[0]

  if (!event) {
    return res.status(404).json({ error: 'Event not found' })
  }

  const ticketResult = await query(
    `
    SELECT
      id,
      event_id,
      name,
      price,
      total_quantity,
      released_quantity,
      sold_quantity,
      is_released,
      GREATEST(released_quantity - sold_quantity, 0) AS available_quantity
    FROM ticket_types
    WHERE event_id = $1
    ORDER BY price ASC
    `,
    [eventId]
  )

  res.json({
    event,
    tickets: ticketResult.rows.map((ticket) => ({
      id: ticket.id,
      eventId: ticket.event_id,
      name: ticket.name,
      price: Number(ticket.price),
      totalQuantity: ticket.total_quantity,
      releasedQuantity: ticket.released_quantity,
      soldQuantity: ticket.sold_quantity,
      availableQuantity: Number(ticket.available_quantity),
      isReleased: ticket.is_released,
      soldOut:
        !ticket.is_released || Number(ticket.available_quantity) <= 0,
    })),
  })
})

app.post('/api/purchase', authRequired, async (req, res) => {
  const { eventId, items } = req.body

  if (!eventId || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'eventId and items are required' })
  }

  const cleanItems = items
    .map((item) => ({
      ticketTypeId: Number(item.ticketTypeId),
      quantity: Number(item.quantity),
    }))
    .filter((item) => item.ticketTypeId && item.quantity > 0)

  if (cleanItems.length === 0) {
    return res.status(400).json({ error: 'No valid ticket quantities selected' })
  }

  const client = await getClient()

  try {
    await client.query('BEGIN')

    const userResult = await client.query(
      `
      SELECT id, email, wallet_balance
      FROM users
      WHERE id = $1
      FOR UPDATE
      `,
      [req.user.id]
    )

    const user = userResult.rows[0]

    if (!user) {
      throw new Error('User not found')
    }

    const ticketIds = cleanItems.map((item) => item.ticketTypeId)

    const ticketResult = await client.query(
      `
      SELECT
        id,
        event_id,
        name,
        price,
        released_quantity,
        sold_quantity,
        is_released
      FROM ticket_types
      WHERE id = ANY($1::int[])
        AND event_id = $2
      FOR UPDATE
      `,
      [ticketIds, eventId]
    )

    const ticketsById = new Map(ticketResult.rows.map((row) => [row.id, row]))

    let total = 0

    for (const item of cleanItems) {
      const ticket = ticketsById.get(item.ticketTypeId)

      if (!ticket) {
        await client.query('ROLLBACK')

        await writeAuditLog({
          userId: req.user.id,
          action: 'PURCHASE_FAILED',
          eventId,
          ticketTypeId: item.ticketTypeId,
          success: false,
          metadata: { reason: 'ticket_type_not_found', item },
        })

        return res.status(400).json({ error: 'Invalid ticket type' })
      }

      if (!ticket.is_released) {
        await client.query('ROLLBACK')

        await writeAuditLog({
          userId: req.user.id,
          action: 'PURCHASE_FAILED',
          eventId,
          ticketTypeId: item.ticketTypeId,
          success: false,
          metadata: { reason: 'ticket_not_released', item },
        })

        return res.status(400).json({ error: `${ticket.name} has not been released yet` })
      }

      const available = ticket.released_quantity - ticket.sold_quantity

      if (available < item.quantity) {
        await client.query('ROLLBACK')

        await writeAuditLog({
          userId: req.user.id,
          action: 'PURCHASE_FAILED',
          eventId,
          ticketTypeId: item.ticketTypeId,
          success: false,
          metadata: {
            reason: 'insufficient_inventory',
            requested: item.quantity,
            available,
          },
        })

        return res.status(400).json({ error: `${ticket.name} is sold out or has insufficient quantity` })
      }

      total += Number(ticket.price) * item.quantity
    }

    if (Number(user.wallet_balance) < total) {
      await client.query('ROLLBACK')

      await writeAuditLog({
        userId: req.user.id,
        action: 'PURCHASE_FAILED',
        eventId,
        success: false,
        metadata: {
          reason: 'insufficient_wallet_balance',
          walletBalance: Number(user.wallet_balance),
          total,
        },
      })

      return res.status(400).json({
        error: 'Insufficient wallet balance',
        walletBalance: Number(user.wallet_balance),
        total,
      })
    }

    const purchaseResult = await client.query(
      `
      INSERT INTO purchases (user_id, event_id, total_amount, status)
      VALUES ($1, $2, $3, 'SUCCESS')
      RETURNING id, created_at
      `,
      [req.user.id, eventId, total]
    )

    const purchase = purchaseResult.rows[0]

    for (const item of cleanItems) {
      const ticket = ticketsById.get(item.ticketTypeId)

      await client.query(
        `
        UPDATE ticket_types
        SET sold_quantity = sold_quantity + $1
        WHERE id = $2
        `,
        [item.quantity, item.ticketTypeId]
      )

      await client.query(
        `
        INSERT INTO purchase_items
          (purchase_id, ticket_type_id, quantity, unit_price)
        VALUES
          ($1, $2, $3, $4)
        `,
        [purchase.id, item.ticketTypeId, item.quantity, ticket.price]
      )
    }

    const updatedUserResult = await client.query(
      `
      UPDATE users
      SET wallet_balance = wallet_balance - $1
      WHERE id = $2
      RETURNING wallet_balance
      `,
      [total, req.user.id]
    )

    await client.query('COMMIT')

    await writeAuditLog({
      userId: req.user.id,
      action: 'PURCHASE_SUCCESS',
      eventId,
      success: true,
      metadata: {
        purchaseId: purchase.id,
        items: cleanItems,
        total,
      },
    })

    res.json({
      success: true,
      purchaseId: purchase.id,
      total,
      createdAt: purchase.created_at,
      walletBalance: Number(updatedUserResult.rows[0].wallet_balance),
    })
  } catch (error) {
    await client.query('ROLLBACK')

    await writeAuditLog({
      userId: req.user?.id || null,
      action: 'PURCHASE_ERROR',
      eventId,
      success: false,
      metadata: { error: error.message },
    })

    res.status(500).json({ error: 'Purchase failed unexpectedly' })
  } finally {
    client.release()
  }
})

app.post('/api/admin/release', authRequired, adminRequired, async (req, res) => {
  const { ticketTypeId, releasedQuantity } = req.body

  if (!ticketTypeId || releasedQuantity === undefined) {
    return res.status(400).json({ error: 'ticketTypeId and releasedQuantity are required' })
  }

  const result = await query(
    `
    UPDATE ticket_types
    SET
      released_quantity = LEAST($1, total_quantity),
      is_released = TRUE
    WHERE id = $2
    RETURNING *
    `,
    [Number(releasedQuantity), Number(ticketTypeId)]
  )

  const ticket = result.rows[0]

  if (!ticket) {
    return res.status(404).json({ error: 'Ticket type not found' })
  }

  await writeAuditLog({
    userId: req.user.id,
    action: 'ADMIN_RELEASE_TICKET_WAVE',
    eventId: ticket.event_id,
    ticketTypeId: ticket.id,
    success: true,
    metadata: {
      releasedQuantity: Number(releasedQuantity),
    },
  })

  res.json({
    success: true,
    ticket,
  })
})

app.get('/api/admin/holdings', authRequired, adminRequired, async (req, res) => {
  const result = await query(
    `
    SELECT
      users.id AS user_id,
      users.email,
      users.wallet_balance,
      events.title AS event_title,
      ticket_types.name AS ticket_type,
      SUM(purchase_items.quantity) AS quantity_owned,
      SUM(purchase_items.quantity * purchase_items.unit_price) AS amount_spent
    FROM users
    LEFT JOIN purchases
      ON purchases.user_id = users.id
      AND purchases.status = 'SUCCESS'
    LEFT JOIN purchase_items
      ON purchase_items.purchase_id = purchases.id
    LEFT JOIN ticket_types
      ON ticket_types.id = purchase_items.ticket_type_id
    LEFT JOIN events
      ON events.id = purchases.event_id
    WHERE users.is_admin = FALSE
    GROUP BY
      users.id,
      users.email,
      users.wallet_balance,
      events.title,
      ticket_types.name
    ORDER BY
      users.email,
      events.title,
      ticket_types.name
    `
  )

  res.json(result.rows)
})

app.get('/api/admin/audit-logs', authRequired, adminRequired, async (req, res) => {
  const result = await query(
    `
    SELECT
      audit_logs.id,
      users.email,
      audit_logs.action,
      audit_logs.event_id,
      audit_logs.ticket_type_id,
      audit_logs.success,
      audit_logs.metadata,
      audit_logs.created_at
    FROM audit_logs
    LEFT JOIN users ON users.id = audit_logs.user_id
    ORDER BY audit_logs.created_at DESC
    LIMIT 200
    `
  )

  res.json(result.rows)
})

app.post('/api/admin/seed-database', async (req, res) => {
  const seedSecret = req.headers['x-seed-secret']

  if (seedSecret !== process.env.SEED_SECRET) {
    return res.status(403).json({ error: 'Invalid seed secret' })
  }

  try {
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

      await query(
        `
        INSERT INTO ticket_types
          (event_id, name, price, total_quantity, released_quantity, sold_quantity, is_released)
        VALUES
          ($1, 'Early Bird Ticket', 1.00, 5, 5, 0, TRUE),
          ($1, 'Pre-General Ticket', 2.00, 10, 0, 0, FALSE),
          ($1, 'General Admission Ticket', 3.00, 15, 0, 0, FALSE)
        `,
        [eventId]
      )
    }

    res.json({ success: true, message: 'Database seeded successfully.' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Database seed failed', detail: error.message })
  }
})

app.listen(PORT, () => {
  console.log(`Ticketing API running on port ${PORT}`)
})
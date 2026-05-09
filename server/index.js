import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { query, getClient } from './db.js'
import fs from 'fs'

import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()

app.use(cors({
  origin: 'https://hunternbh.github.io',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-seed-secret'],
}))

app.use(express.json())

// Serve static files from the 'dist' directory
const distPath = path.join(__dirname, '../dist')
app.use(express.static(distPath))

const PORT = process.env.PORT || 10000
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-this'

// In-memory rate-limit store.
// Good enough for a classroom sandbox on one Render instance.
const rateLimitStore = new Map()

function rateLimit({
  keyPrefix,
  maxRequests = 2,
  windowMs = 1000,
  getKey,
}) {
  return async function rateLimitMiddleware(req, res, next) {
    const key = `${keyPrefix}:${getKey(req)}`
    const now = Date.now()

    const existing = rateLimitStore.get(key) || []
    const recent = existing.filter((timestamp) => now - timestamp < windowMs)

    if (recent.length >= maxRequests) {
      await writeAuditLog({
        userId: req.user?.id || null,
        action: 'RATE_LIMIT_BLOCKED',
        success: false,
        metadata: {
          path: req.path,
          method: req.method,
          key,
          maxRequests,
          windowMs,
          recentCount: recent.length,
        },
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      })

      return res.status(429).json({
        error: 'Too many requests. Please slow down.',
        retryAfterSeconds: Math.ceil(windowMs / 1000),
      })
    }

    recent.push(now)
    rateLimitStore.set(key, recent)

    next()
  }
}

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

const userTwoPerSecond = rateLimit({
  keyPrefix: 'user',
  maxRequests: 5,
  windowMs: 1000,
  getKey: (req) => req.user?.id || req.ip,
})

function adminRequired(req, res, next) {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' })
  }

  next()
}

app.get('/api/my-holdings', authRequired, userTwoPerSecond, async (req, res) => {
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
  ip = null,
  userAgent = null,
}) {
  await query(
    `
    INSERT INTO audit_logs
      (user_id, action, event_id, ticket_type_id, success, metadata, ip_address, user_agent)
    VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8)
    `,
    [userId, action, eventId, ticketTypeId, success, metadata, ip, userAgent]
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
      ip: req.ip,
      userAgent: req.headers['user-agent'],
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
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    })

    return res.status(401).json({ error: 'Invalid email or password' })
  }

  await writeAuditLog({
    userId: user.id,
    action: 'LOGIN_SUCCESS',
    success: true,
    metadata: { email },
    ip: req.ip,
    userAgent: req.headers['user-agent'],
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

app.get('/api/me', authRequired, userTwoPerSecond, async (req, res) => {
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

app.post('/api/purchase', authRequired, userTwoPerSecond, async (req, res) => {
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
      INSERT INTO purchases (user_id, event_id, total_amount, status, ip_address, user_agent)
      VALUES ($1, $2, $3, 'SUCCESS', $4, $5)
      RETURNING id, created_at
      `,
      [req.user.id, eventId, total, req.ip, req.headers['user-agent']]
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
      ip: req.ip,
      userAgent: req.headers['user-agent'],
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

app.post('/api/admin/release-more', authRequired, adminRequired, async (req, res) => {
  const { ticketTypeId, additionalQuantity } = req.body

  if (!ticketTypeId || additionalQuantity === undefined) {
    return res.status(400).json({
      error: 'ticketTypeId and additionalQuantity are required',
    })
  }

  const result = await query(
    `
    UPDATE ticket_types
    SET
      released_quantity = LEAST(released_quantity + $1, total_quantity),
      is_released = TRUE
    WHERE id = $2
    RETURNING
      id,
      event_id,
      name,
      price,
      total_quantity,
      released_quantity,
      sold_quantity,
      GREATEST(released_quantity - sold_quantity, 0) AS available_quantity,
      is_released
    `,
    [Number(additionalQuantity), Number(ticketTypeId)]
  )

  const ticket = result.rows[0]

  if (!ticket) {
    return res.status(404).json({ error: 'Ticket type not found' })
  }

  await writeAuditLog({
    userId: req.user.id,
    action: 'ADMIN_RELEASE_MORE_TICKETS',
    eventId: ticket.event_id,
    ticketTypeId: ticket.id,
    success: true,
    metadata: {
      additionalQuantity: Number(additionalQuantity),
      releasedQuantity: Number(ticket.released_quantity),
      availableQuantity: Number(ticket.available_quantity),
    },
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  })

  res.json({
    success: true,
    ticket: {
      id: ticket.id,
      eventId: ticket.event_id,
      name: ticket.name,
      price: Number(ticket.price),
      totalQuantity: Number(ticket.total_quantity),
      releasedQuantity: Number(ticket.released_quantity),
      soldQuantity: Number(ticket.sold_quantity),
      availableQuantity: Number(ticket.available_quantity),
      isReleased: ticket.is_released,
    },
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
    LIMIT 1000
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
  { email: 'brien.spence22@seatgate-ticket.com', password: 'K7mQ2vR9xT', walletBalance: 3, isAdmin: false },
  { email: 'brian.okonski38@seatgate-ticket.com', password: 'p4Wz8Nq1Ld', walletBalance: 3, isAdmin: false },
  { email: 'fuge.jia92@seatgate-ticket.com', password: 'X9rT6bY2mC', walletBalance: 3, isAdmin: false },
  { email: 'luis.vargas207@seatgate-ticket.com', password: 'q8Lw3Vz7Np', walletBalance: 3, isAdmin: false },
  { email: 'yongen.li71@seatgate-ticket.com', password: 'B2nM9cK5rV', walletBalance: 3, isAdmin: false },
  { email: 'peijun.liu22@seatgate-ticket.com', password: 't6Rz1Qx8La', walletBalance: 3, isAdmin: false },
  { email: 'haoran.zhuo55@seatgate-ticket.com', password: 'M5vP2kN7sQ', walletBalance: 3, isAdmin: false },
  { email: 'sean.hong76@seatgate-ticket.com', password: 'z3Kb8Yw4Rt', walletBalance: 3, isAdmin: false },
  { email: 'guy.fedida55@seatgate-ticket.com', password: 'N9xL2qV6mP', walletBalance: 3, isAdmin: false },
  { email: 'azriel.alfitri39@seatgate-ticket.com', password: 'c7Wm4Tz1Ry', walletBalance: 3, isAdmin: false },
  { email: 'alden.guo42@seatgate-ticket.com', password: 'P8qN3bK6xL', walletBalance: 3, isAdmin: false },
  { email: 'heinchialexan.wufeng20@seatgate-ticket.com', password: 'v2Yt9Mz5Qc', walletBalance: 3, isAdmin: false },
  { email: 'khalid.benoit99@seatgate-ticket.com', password: 'L4rX7nB1wK', walletBalance: 3, isAdmin: false },
  { email: 'destiny.rivera70@seatgate-ticket.com', password: 's9Qp2Vz6Tm', walletBalance: 3, isAdmin: false },
  { email: 'bryan.joserosario44@seatgate-ticket.com', password: 'D6mK8xR3nY', walletBalance: 3, isAdmin: false },
  { email: 'ani.kiknadze79@seatgate-ticket.com', password: 'w1Tz7Lp4Qx', walletBalance: 3, isAdmin: false },
  { email: 'jiaxian.wu67@seatgate-ticket.com', password: 'R5bN9cM2vK', walletBalance: 3, isAdmin: false },
  { email: 'antanina.labacheuskaya59@seatgate-ticket.com', password: 'x8Vq3Lz6Wp', walletBalance: 3, isAdmin: false },
  { email: 'meerim.taalaibekkyzy92@seatgate-ticket.com', password: 'K2pY7mR4nQ', walletBalance: 3, isAdmin: false },
  { email: 'airong.li53@seatgate-ticket.com', password: 't9Cw5Xq1Lb', walletBalance: 3, isAdmin: false },
  { email: 'muhammad.huzaifah80@seatgate-ticket.com', password: 'N3vR8kP6zM', walletBalance: 3, isAdmin: false },
  { email: 'thiti.das45@seatgate-ticket.com', password: 'q6Lx2Wm9Tc', walletBalance: 3, isAdmin: false },
  { email: 'sezim.taalaibekova04@seatgate-ticket.com', password: 'B7nQ4zV1Rp', walletBalance: 3, isAdmin: false },
  { email: 'kenny.le44@seatgate-ticket.com', password: 'm2Kx8Yt5Wq', walletBalance: 3, isAdmin: false },
  { email: 'raymond.li50@seatgate-ticket.com', password: 'P9cL3vR6Nz', walletBalance: 3, isAdmin: false },
  { email: 'yixiang.tan56@seatgate-ticket.com', password: 'w5Qm1Kx7Tb', walletBalance: 3, isAdmin: false },
  { email: 'lhakpa.sherpa636@seatgate-ticket.com', password: 'R8zN2pV4Lc', walletBalance: 3, isAdmin: false },
  { email: 'lhakpa.sherpa09@seatgate-ticket.com', password: 'x1Tq9M6wKb', walletBalance: 3, isAdmin: false },
  { email: 'yeshi.lhakey81@seatgate-ticket.com', password: 'L6vP3zY8Qm', walletBalance: 3, isAdmin: false },
  { email: 'ying.jiang10@seatgate-ticket.com', password: 'c4Kx7R2nWt', walletBalance: 3, isAdmin: false },
  { email: 'porfirio.martinez38@seatgate-ticket.com', password: 'M9qB5vL1Zp', walletBalance: 3, isAdmin: false },
  { email: 'tony.zheng08@seatgate-ticket.com', password: 't2Wn8Kc6Rx', walletBalance: 3, isAdmin: false },
  { email: 'drupattie.naul90@seatgate-ticket.com', password: 'Q7mL4zP9vN', walletBalance: 3, isAdmin: false },
  { email: 'xiaoru.lin05@seatgate-ticket.com', password: 'b5Xq1Tn8Kp', walletBalance: 3, isAdmin: false },
  { email: 'emily.hu16@seatgate-ticket.com', password: 'V3rK9mW2Lc', walletBalance: 3, isAdmin: false },
  { email: 'tony.zeng44@seatgate-ticket.com', password: 'p8Nq6Zx1Tb', walletBalance: 3, isAdmin: false },
  { email: 'anson.huang77@seatgate-ticket.com', password: 'K4wR7vM2Qz', walletBalance: 3, isAdmin: false },
  { email: 'jonathan.rojasvilchis44@seatgate-ticket.com', password: 'x9Lz3Cp6Vn', walletBalance: 3, isAdmin: false },
  { email: 'hurairah.mustafa68@seatgate-ticket.com', password: 'T1mQ8Kb5Rw', walletBalance: 3, isAdmin: false },
  { email: 'dingwen.chen41@seatgate-ticket.com', password: 'n7Vx2Lz9Pc', walletBalance: 3, isAdmin: false },
  { email: 'afifa.nuha36@seatgate-ticket.com', password: 'B6qW3Rm8Yt', walletBalance: 3, isAdmin: false },
  { email: 'melody.kwok85@seatgate-ticket.com', password: 'z2Kp7Xn4Lv', walletBalance: 3, isAdmin: false },
  { email: 'aryan.kumar91@seatgate-ticket.com', password: 'R9cM1Tq6Wx', walletBalance: 3, isAdmin: false },
  { email: 'emmanuel.paravalos73@seatgate-ticket.com', password: 'v5Lz8Np2Qk', walletBalance: 3, isAdmin: false },
  { email: 'yihan.yeung55@seatgate-ticket.com', password: 'C3xR7mK9Tb', walletBalance: 3, isAdmin: false },
  { email: 'gabriela.hernandez53@seatgate-ticket.com', password: 'q8Vn4Wz1Lp', walletBalance: 3, isAdmin: false },
  { email: 'ahnaf.jawad76@seatgate-ticket.com', password: 'M2kT9cR6Xv', walletBalance: 3, isAdmin: false },
  { email: 'jingtong.xu82@seatgate-ticket.com', password: 'p7Qx5Ln3Wm', walletBalance: 3, isAdmin: false },
  { email: 'fiona.li21@seatgate-ticket.com', password: 'Y1vK8zP4Rc', walletBalance: 3, isAdmin: false },
  { email: 'jesus.tiros97@seatgate-ticket.com', password: 'n6Tq2Xw9Lb', walletBalance: 3, isAdmin: false },
  { email: 'aden.zheng18@seatgate-ticket.com', password: 'K9mV3cL7Qp', walletBalance: 3, isAdmin: false },
  { email: 'ahmed.salehin48@seatgate-ticket.com', password: 'w4Rz8Nq1Tx', walletBalance: 3, isAdmin: false },
  { email: 'tahir.rajin95@seatgate-ticket.com', password: 'P2bL6vK9Zm', walletBalance: 3, isAdmin: false },
  { email: 'grace.lee41@seatgate-ticket.com', password: 'x7Qn3Wc5Rt', walletBalance: 3, isAdmin: false },
  { email: 'ariana.palomino83@seatgate-ticket.com', password: 'L8mT1zV6Kq', walletBalance: 3, isAdmin: false },
  { email: 'robiul.sazzad18@seatgate-ticket.com', password: 'c5Xw9Np2Rb', walletBalance: 3, isAdmin: false },
  { email: 'jordi.mendezparis96@seatgate-ticket.com', password: 'N4qK7vM1Tz', walletBalance: 3, isAdmin: false },
  { email: 'samuel.chiquitero67@seatgate-ticket.com', password: 't9Lx3Wm8Qc', walletBalance: 3, isAdmin: false },
  { email: 'imanol.gayosso54@seatgate-ticket.com', password: 'B1vP6zR4Kn', walletBalance: 3, isAdmin: false },
  { email: 'prince.manukure75@seatgate-ticket.com', password: 'm8Qx2Tc7Lp', walletBalance: 3, isAdmin: false },
  { email: 'amir.abdygulov14@seatgate-ticket.com', password: 'R3nK9wV5Zq', walletBalance: 3, isAdmin: false },
  { email: 'jie.ouyang11@seatgate-ticket.com', password: 'p6Lz1Xm8Wt', walletBalance: 3, isAdmin: false },
  { email: 'christian.champagne73@seatgate-ticket.com', password: 'K7qC4vN2Rb', walletBalance: 3, isAdmin: false },
  { email: 'wenrui.liu78@seatgate-ticket.com', password: 'z9Tn5Lp1Qx', walletBalance: 3, isAdmin: false },
  { email: 'douglas.trosten18@seatgate-ticket.com', password: 'M4wR8cK6Vq', walletBalance: 3, isAdmin: false },
  { email: 'oleh.terletskyi61@seatgate-ticket.com', password: 'x2Nq7Zp9Lm', walletBalance: 3, isAdmin: false },
  { email: 'seongjun.an18@seatgate-ticket.com', password: 'T5vK1mW8Rc', walletBalance: 3, isAdmin: false },
  { email: 'shuhua.yu77@seatgate-ticket.com', password: 'n9Qx3Lz6Pb', walletBalance: 3, isAdmin: false },
  { email: 'maha.shabir44@seatgate-ticket.com', password: 'B2mV7Rt4Kq', walletBalance: 3, isAdmin: false },
  { email: 'emily.young24@seatgate-ticket.com', password: 'w8Lx5Np1Zc', walletBalance: 3, isAdmin: false },
  { email: 'kevin.joseph29@seatgate-ticket.com', password: 'P6qT2Km9Rv', walletBalance: 3, isAdmin: false },
  { email: 'santiago.patino47@seatgate-ticket.com', password: 'c3Nw8Xz5Lp', walletBalance: 3, isAdmin: false },
  { email: 'dingling.chen76@seatgate-ticket.com', password: 'L9vQ1Tb7Mx', walletBalance: 3, isAdmin: false },
  { email: 'abdul.adeniji37@seatgate-ticket.com', password: 'r4Kz6Wp2Nc', walletBalance: 3, isAdmin: false },
  { email: 'ziannaalfiya.gallego73@seatgate-ticket.com', password: 'Y8mL3Qx9Tv', walletBalance: 3, isAdmin: false },
  { email: 'test@test.com', password: 'test', walletBalance: 99, isAdmin: false },
  { email: 'admin@seatgate-ticket.com', password: 'adminpass', walletBalance: 5, isAdmin: true },
]

    for (const user of users) {
      const passwordHash = await bcrypt.hash(user.password, 10)

      await query(
        `
        INSERT INTO users (email, password_hash, wallet_balance, is_admin)
        VALUES ($1, $2, $3, $4)
        `,
        [user.email, passwordHash, user.walletBalance ?? 3.0, user.isAdmin]
      )
    }

    const events = [
      [1, 'SeatGate X Trial', 'Audit Control Theatre', 'Friday, Apr 25, 2026', 'seatgate-1.png'],
      [2, 'SeatGate X One', 'Revenue Recognition Hall', 'Friday, Apr 25, 2026', 'seatgate-2.png'],
      [3, 'SeatGate X Two', 'Bot Detection Center', 'Friday, Apr 25, 2026', 'seatgate-3.png'],
      [4, 'SeatGate X Three', 'Central Park Carousel', 'Friday, Apr 25, 2026', 'seatgate-4.png'],
      [5, 'SeatGate X Final', 'ACC3202 Classroom Simulation', 'Friday, Apr 25, 2026', 'seatgate-5.png'],
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
        ($1, 'Early Bird Ticket', $2, 99999, 0, 0, TRUE),
        ($1, 'Pre-General Ticket', $2, 99999, 0, 0, FALSE),
        ($1, 'General Admission Ticket', $2, 99999, 0, 0, FALSE)
        `,
        [eventId, price]
    )
    }

    res.json({ success: true, message: 'Database seeded successfully.' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Database seed failed', detail: error.message })
  }
})

app.get('/api/admin/ticket-types', authRequired, adminRequired, async (req, res) => {
  const result = await query(
    `
    SELECT
      events.id AS event_id,
      events.title AS event_title,
      ticket_types.id AS ticket_type_id,
      ticket_types.name AS ticket_type,
      ticket_types.price,
      ticket_types.total_quantity,
      ticket_types.released_quantity,
      ticket_types.sold_quantity,
      GREATEST(ticket_types.released_quantity - ticket_types.sold_quantity, 0) AS available_quantity,
      ticket_types.is_released
    FROM ticket_types
    JOIN events
      ON events.id = ticket_types.event_id
    ORDER BY
      events.id,
      ticket_types.price,
      ticket_types.id
    `
  )

  res.json(
    result.rows.map((row) => ({
      eventId: row.event_id,
      eventTitle: row.event_title,
      ticketTypeId: row.ticket_type_id,
      ticketType: row.ticket_type,
      price: Number(row.price),
      totalQuantity: Number(row.total_quantity),
      releasedQuantity: Number(row.released_quantity),
      soldQuantity: Number(row.sold_quantity),
      availableQuantity: Number(row.available_quantity),
      isReleased: row.is_released,
    }))
  )
})

// Support SPA routing: redirect all non-API requests to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'))
})

app.listen(PORT, () => {
  console.log(`Ticketing API running on port ${PORT}`)
})
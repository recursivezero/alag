import { Context } from 'hono'
import { db } from '../config/db'
import { comparePassword, hashPassword } from '../utils/hash'
import { createAdminToken, verifyAdminToken } from '../utils/jwt'
import { generateOTP } from '../utils/generateOTP'
import { sendOTPEmail } from '../utils/mailer'
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE,
  clearSessionCookieOptions,
  sessionCookieOptions,
} from '../utils/session'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'

const parsePositiveInt = (
  value: string | undefined,
  fallback: number,
  min: number,
  max: number,
) => {
  const parsed = Number.parseInt(value || '', 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, parsed))
}

type UserActivityEvent = {
  userId: number
  eventType: 'created' | 'enabled' | 'disabled' | 'deleted'
  createdAt: string
}

type UserSnapshot = {
  totalUsers: number
  activeUsers: number
  disabledUsers: number
  deletedUsers: number
}

const snapshotFromEvents = (
  events: UserActivityEvent[],
  cutoff: Date,
): UserSnapshot => {
  const latestEvents = new Map<number, UserActivityEvent['eventType']>()
  const cutoffTime = cutoff.getTime()

  for (const event of events) {
    const eventTime = new Date(event.createdAt).getTime()
    if (eventTime > cutoffTime) break
    latestEvents.set(Number(event.userId), event.eventType)
  }

  const snapshot: UserSnapshot = {
    totalUsers: 0,
    activeUsers: 0,
    disabledUsers: 0,
    deletedUsers: 0,
  }

  for (const eventType of latestEvents.values()) {
    if (eventType === 'deleted') {
      snapshot.deletedUsers += 1
      continue
    }

    snapshot.totalUsers += 1

    if (eventType === 'disabled') {
      snapshot.disabledUsers += 1
    } else {
      snapshot.activeUsers += 1
    }
  }

  return snapshot
}

const calculateTrend = (currentValue: number, previousValue: number) => {
  if (previousValue === 0) {
    return currentValue === 0 ? 0 : 100
  }

  return Math.round(((currentValue - previousValue) / previousValue) * 100)
}

const getDeletedUsersTotal = async () => {
  const [rows]: any = await db.execute(
    'SELECT metric_value AS deletedUsers FROM admin_dashboard_metrics WHERE metric_key = ? LIMIT 1',
    ['deleted_users_total']
  )

  return Number(rows[0]?.deletedUsers || 0)
}

const incrementDeletedUsersTotal = async () => {
  await db.execute(
    `
    INSERT INTO admin_dashboard_metrics (metric_key, metric_value)
    VALUES (?, 1)
    ON DUPLICATE KEY UPDATE metric_value = metric_value + 1
    `,
    ['deleted_users_total']
  )

  return getDeletedUsersTotal()
}

const loadUserSnapshots = async () => {
  const [rows]: any = await db.execute(
    `
    SELECT
      user_id AS userId,
      event_type AS eventType,
      created_at AS createdAt
    FROM user_activity_logs
    ORDER BY created_at ASC, id ASC
    `,
  )

  const events = rows as UserActivityEvent[]
  const now = new Date()
  const previousMonth = new Date(now)
  previousMonth.setMonth(previousMonth.getMonth() - 1)

  const currentSnapshot = snapshotFromEvents(events, now)
  const previousSnapshot = snapshotFromEvents(events, previousMonth)

  return {
    currentSnapshot,
    previousSnapshot,
    trends: {
      totalUsers: calculateTrend(currentSnapshot.totalUsers, previousSnapshot.totalUsers),
      activeUsers: calculateTrend(currentSnapshot.activeUsers, previousSnapshot.activeUsers),
      disabledUsers: calculateTrend(currentSnapshot.disabledUsers, previousSnapshot.disabledUsers),
      deletedUsers: calculateTrend(currentSnapshot.deletedUsers, previousSnapshot.deletedUsers),
    },
  }
}

const getAdminFromAuthHeader = async (c: Context) => {
  try {
    const authHeader = c.req.header('Authorization')
    const cookieToken = getCookie(c, ADMIN_SESSION_COOKIE)
    const token = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : cookieToken

    if (!token) return null

    const payload = verifyAdminToken(token)
    if (!payload) return null

    const [rows]: any = await db.execute(
      'SELECT id, full_name, email, role FROM admins WHERE id = ? LIMIT 1',
      [payload.id]
    )

    if (!rows.length) return null
    return rows[0]
  } catch {
    return null
  }
}

const issueAdminSession = (c: Context, token: string) => {
  setCookie(c, ADMIN_SESSION_COOKIE, token, sessionCookieOptions(ADMIN_SESSION_MAX_AGE))
}

const clearAdminSession = (c: Context) => {
  deleteCookie(c, ADMIN_SESSION_COOKIE, clearSessionCookieOptions())
}

export const adminLogin = async (c: Context) => {
  try {
    const body = await c.req.json()
    const email = typeof body.email === 'string' ? body.email.trim() : ''
    const password = typeof body.password === 'string' ? body.password : ''

    if (!email || !password) {
      return c.json({ message: 'Email and password are required' }, 400)
    }

    const [rows]: any = await db.execute(
      'SELECT id, full_name, email, password, role FROM admins WHERE email = ? LIMIT 1',
      [email.toLowerCase()]
    )

    if (!rows.length) {
      return c.json({ message: 'Invalid admin credentials' }, 401)
    }

    const admin = rows[0]
    const isValid = await comparePassword(password, admin.password)
    if (!isValid) {
      return c.json({ message: 'Invalid admin credentials' }, 401)
    }

    const token = createAdminToken(admin.id)
    issueAdminSession(c, token)
    return c.json({
      role: 'admin',
      redirectTo: '/admin/dashboard',
      admin: {
        id: admin.id,
        full_name: admin.full_name,
        name: admin.full_name,
        email: admin.email,
        role: admin.role,
      },
    })
  } catch (error) {
    console.error('adminLogin error:', error)
    return c.json({ message: 'Unable to complete admin login' }, 500)
  }
}

export const adminMe = async (c: Context) => {
  const admin = await getAdminFromAuthHeader(c)
  if (!admin) {
    return c.json({ message: 'Unauthorized' }, 401)
  }

  return c.json({ admin })
}

export const adminLogout = async (c: Context) => {
  clearAdminSession(c)
  return c.json({ message: 'Logged out' })
}

export const adminDashboardData = async (c: Context) => {
  try {
    const admin = await getAdminFromAuthHeader(c)
    if (!admin) {
      return c.json({ message: 'Unauthorized' }, 401)
    }

    const search = (c.req.query('search') || '').trim()
    const searchTerm = search.toLowerCase()
    const role = (c.req.query('role') || 'all').toLowerCase()
    const status = (c.req.query('status') || 'all').toLowerCase()
    const page = parsePositiveInt(c.req.query('page'), 1, 1, 1000000)
    const pageSize = parsePositiveInt(c.req.query('pageSize'), 5, 5, 20)
    const offset = (page - 1) * pageSize
    const userSnapshots = await loadUserSnapshots()
    const deletedUsers = await getDeletedUsersTotal()
    const dashboardUsersSql = `
      SELECT
        0 AS sortOrder,
        0 AS id,
        'Admin User' AS fullName,
        'admin@gmail.com' AS email,
        'admin' AS role,
        0 AS isDisabled,
        '2026-05-24 12:00:00' AS createdAt
      UNION ALL
      SELECT
        1 AS sortOrder,
        id,
        COALESCE(full_name, name) AS fullName,
        email,
        role,
        is_disabled AS isDisabled,
        created_at AS createdAt
      FROM users
    `

    const whereParts: string[] = []
    const filterParams: Array<string | number> = []

    if (search) {
      whereParts.push('(LOWER(fullName) LIKE ? OR LOWER(email) LIKE ?)')
      filterParams.push(`%${searchTerm}%`, `%${searchTerm}%`)
    }

    if (role !== 'all') {
      whereParts.push('LOWER(role) = ?')
      filterParams.push(role)
    }

    if (status === 'enabled') {
      whereParts.push('is_disabled = false')
    } else if (status === 'disabled') {
      whereParts.push('is_disabled = true')
    }

    const whereSql = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : ''

    const countQuery = `SELECT COUNT(*) AS total FROM (${dashboardUsersSql}) AS dashboard_users ${whereSql}`
    const usersQuery = `
      SELECT
        id,
        fullName,
        email,
        role,
        isDisabled,
        createdAt
      FROM (${dashboardUsersSql}) AS dashboard_users
      ${whereSql}
      ORDER BY sortOrder ASC, id DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `

    const countParams = [...filterParams]
    const usersParams = [...filterParams]

    const [countRows]: any = countParams.length
      ? await db.execute(countQuery, countParams)
      : await db.execute(countQuery)

    const [usersRows]: any = usersParams.length
      ? await db.execute(usersQuery, usersParams)
      : await db.execute(usersQuery)

    return c.json({
      admin,
      stats: {
        ...userSnapshots.currentSnapshot,
        totalUsers: userSnapshots.currentSnapshot.totalUsers + 1,
        activeUsers: userSnapshots.currentSnapshot.activeUsers + 1,
        deletedUsers,
      },
      trends: userSnapshots.trends,
      users: usersRows,
      pagination: {
        page,
        pageSize,
        total: Number(countRows[0]?.total || 0),
        totalPages: Math.max(1, Math.ceil(Number(countRows[0]?.total || 0) / pageSize)),
      },
    })
  } catch (error) {
    console.error('adminDashboardData error:', error)
    return c.json({ message: 'Unable to load admin dashboard data' }, 500)
  }
}

export const adminListUsers = async (c: Context) => {
  const admin = await getAdminFromAuthHeader(c)
  if (!admin) {
    return c.json({ message: 'Unauthorized' }, 401)
  }

  const deletedUsers = await getDeletedUsersTotal()

  const search = (c.req.query('search') || '').trim()
  const status = (c.req.query('status') || 'all').toLowerCase()

  const whereParts: string[] = []
  const params: Array<string | number> = []

  if (search) {
    whereParts.push('(COALESCE(full_name, name) LIKE ? OR email LIKE ?)')
    params.push(`%${search}%`, `%${search}%`)
  }

  if (status === 'enabled') {
    whereParts.push('is_disabled = false')
  } else if (status === 'disabled') {
    whereParts.push('is_disabled = true')
  }

  const whereSql = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : ''

  const [rows]: any = await db.execute(
    `
    SELECT
      id,
      COALESCE(full_name, name) AS fullName,
      email,
      created_at AS createdAt,
      is_disabled AS isDisabled
    FROM users
    ${whereSql}
    ORDER BY id ASC
    `,
    params
  )

  return c.json({
    users: rows,
    totalUsers: rows.length,
    deletedUsers,
  })
}

export const adminCreateUser = async (c: Context) => {
  const admin = await getAdminFromAuthHeader(c)
  if (!admin) {
    return c.json({ message: 'Unauthorized' }, 401)
  }

  const body = await c.req.json()
  const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : ''
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  const verificationMethod = body.verificationMethod === 'otp' ? 'otp' : 'direct'

  if (!fullName || !email || !password) {
    return c.json({ message: 'All fields are required' }, 400)
  }

  if (password.length < 8) {
    return c.json({ message: 'Password must be at least 8 characters long' }, 400)
  }

  const [existingUsers]: any = await db.execute(
    'SELECT id FROM users WHERE email = ? LIMIT 1',
    [email]
  )
  const [pendingUsers]: any = await db.execute(
    'SELECT email FROM pending_registrations WHERE email = ? LIMIT 1',
    [email]
  )

  if (existingUsers.length || pendingUsers.length) {
    return c.json({ message: 'Email already registered' }, 409)
  }

  if (verificationMethod === 'otp') {
    const hashedPassword = await hashPassword(password)
    const otp = generateOTP()

    await db.execute(
      `
      INSERT INTO pending_registrations (email, name, password)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        password = VALUES(password)
      `,
      [email, fullName, hashedPassword]
    )

    await db.execute(
      'INSERT INTO otp_codes (email, otp, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 7 MINUTE))',
      [email, otp]
    )

    const sent = await sendOTPEmail(email, otp)
    if (!sent) {
      await db.execute('DELETE FROM otp_codes WHERE email = ?', [email])
      await db.execute('DELETE FROM pending_registrations WHERE email = ?', [email])
      return c.json({ message: 'Failed to send OTP email' }, 500)
    }

    return c.json(
      {
        message: 'OTP sent to email for verification',
        verificationMethod,
      },
      201
    )
  }

  const hashedPassword = await hashPassword(password)
  const [result]: any = await db.execute(
    `
    INSERT INTO users (full_name, name, email, password, role, auth_provider, is_verified, is_disabled)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [fullName, fullName, email, hashedPassword, 'user', 'email', true, false]
  )

  await db.execute(
    'INSERT INTO user_activity_logs (user_id, event_type) VALUES (?, ?)',
    [result.insertId, 'created']
  )

  const [rows]: any = await db.execute(
    `
    SELECT
      id,
      COALESCE(full_name, name) AS fullName,
      email,
      created_at AS createdAt,
      is_disabled AS isDisabled
    FROM users
    WHERE id = ?
    LIMIT 1
    `,
    [result.insertId]
  )

  return c.json({ message: 'User created successfully', user: rows[0] || null }, 201)
}

export const adminEnableUser = async (c: Context) => {
  const admin = await getAdminFromAuthHeader(c)
  if (!admin) {
    return c.json({ message: 'Unauthorized' }, 401)
  }

  const id = Number(c.req.param('id'))
  if (!Number.isInteger(id) || id <= 0) {
    return c.json({ message: 'Invalid user id' }, 400)
  }

  const [result]: any = await db.execute(
    'UPDATE users SET is_disabled = false WHERE id = ?',
    [id]
  )

  if (!result?.affectedRows) {
    return c.json({ message: 'User not found' }, 404)
  }

  await db.execute(
    'INSERT INTO user_activity_logs (user_id, event_type) VALUES (?, ?)',
    [id, 'enabled']
  )

  return c.json({ message: 'User enabled', id })
}

export const adminDisableUser = async (c: Context) => {
  const admin = await getAdminFromAuthHeader(c)
  if (!admin) {
    return c.json({ message: 'Unauthorized' }, 401)
  }

  const id = Number(c.req.param('id'))
  if (!Number.isInteger(id) || id <= 0) {
    return c.json({ message: 'Invalid user id' }, 400)
  }

  const [result]: any = await db.execute(
    'UPDATE users SET is_disabled = true WHERE id = ?',
    [id]
  )

  if (!result?.affectedRows) {
    return c.json({ message: 'User not found' }, 404)
  }

  await db.execute(
    'INSERT INTO user_activity_logs (user_id, event_type) VALUES (?, ?)',
    [id, 'disabled']
  )

  return c.json({ message: 'User disabled', id })
}

export const adminDeleteUser = async (c: Context) => {
  const admin = await getAdminFromAuthHeader(c)
  if (!admin) {
    return c.json({ message: 'Unauthorized' }, 401)
  }

  const id = Number(c.req.param('id'))
  if (!Number.isInteger(id) || id <= 0) {
    return c.json({ message: 'Invalid user id' }, 400)
  }

  const [result]: any = await db.execute('DELETE FROM users WHERE id = ?', [id])

  if (!result?.affectedRows) {
    return c.json({ message: 'User not found' }, 404)
  }

  await db.execute(
    'INSERT INTO user_activity_logs (user_id, event_type) VALUES (?, ?)',
    [id, 'deleted']
  )

  const deletedUsers = await incrementDeletedUsersTotal()
  return c.json({
    message: 'User deleted permanently',
    id,
    deletedUsers,
  })
}

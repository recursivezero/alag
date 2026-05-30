import { Context } from 'hono'
import crypto from 'node:crypto'
import { OAuth2Client } from 'google-auth-library'
import { db } from '../config/db'
import { generateOTP } from '../utils/generateOTP'
import { hashPassword, comparePassword } from '../utils/hash'
import { createToken, verifyToken } from '../utils/jwt'
import {
  USER_SESSION_COOKIE,
  USER_SESSION_MAX_AGE,
  USER_SESSION_REMEMBER_MAX_AGE,
  sessionCookieOptions,
} from '../utils/session'
import { clearSessionCookieOptions } from '../utils/session'
import { deleteCookie } from 'hono/cookie'
import { sendOTPEmail, sendPasswordResetEmail } from '../utils/mailer'
import { getCookie, setCookie } from 'hono/cookie'

const googleClientId = process.env.GOOGLE_CLIENT_ID || ''
const googleClient = googleClientId ? new OAuth2Client(googleClientId) : null
const frontendUrl = (process.env.FRONTEND_URL || process.env.PUBLIC_FRONTEND_URL || 'http://localhost:4321').replace(/\/$/, '')

const hashResetToken = (token: string) =>
  crypto.createHash('sha256').update(token).digest('hex')

const hashSessionToken = (token: string) =>
  crypto.createHash('sha256').update(token).digest('hex')

const createSessionToken = () => crypto.randomBytes(32).toString('base64url')

const getClientIp = (c: Context) =>
  c.req.header('cf-connecting-ip') ||
  c.req.header('x-real-ip') ||
  c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
  null

const getSessionExpiry = (remember: boolean) =>
  new Date(Date.now() + (remember ? USER_SESSION_REMEMBER_MAX_AGE : USER_SESSION_MAX_AGE) * 1000)

const privateIpPatterns = [
  /^10\./,
  /^127\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^::1$/,
  /^fc00:/i,
  /^fe80:/i,
]

const isPrivateIp = (ip: string) => privateIpPatterns.some((pattern) => pattern.test(ip))

const formatSessionDateIst = (input = new Date()) =>
  `${new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(input)} IST`

const getDeviceName = (userAgent: string | null) => {
  const ua = (userAgent || '').toLowerCase()
  if (!ua) return 'Unknown device'
  if (ua.includes('iphone')) return 'iPhone'
  if (ua.includes('ipad')) return 'iPad'
  if (ua.includes('android')) return 'Android'
  if (ua.includes('macintosh') || ua.includes('mac os x')) return 'MacBook'
  if (ua.includes('windows')) return 'Windows PC'
  if (ua.includes('linux')) return 'Linux PC'
  return 'Unknown device'
}

const getBrowserName = (userAgent: string | null) => {
  const ua = userAgent || ''
  if (/Brave\//i.test(ua)) return 'Brave'
  if (/Edg\//i.test(ua)) return 'Edge'
  if (/OPR\//i.test(ua) || /Opera/i.test(ua)) return 'Opera'
  if (/Firefox\//i.test(ua)) return 'Firefox'
  if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua) && !/OPR\//i.test(ua) && !/Brave\//i.test(ua)) return 'Chrome'
  if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua) && !/Chromium\//i.test(ua) && !/Edg\//i.test(ua)) return 'Safari'
  return 'Unknown browser'
}

const getRequestLocation = (c: Context) => {
  const city = c.req.header('cf-ipcity') || c.req.header('x-vercel-ip-city') || ''
  const state =
    c.req.header('cf-region') ||
    c.req.header('cf-ipregion') ||
    c.req.header('x-vercel-ip-country-region') ||
    c.req.header('x-vercel-ip-region') ||
    ''
  const country =
    c.req.header('cf-ipcountry') ||
    c.req.header('x-vercel-ip-country') ||
    c.req.header('x-country') ||
    ''

  const parts = [city, state, country].map((part) => part.trim()).filter(Boolean)
  return parts.length ? parts.join(', ') : ''
}

const lookupLocationFromIp = async (ip: string | null) => {
  if (!ip || isPrivateIp(ip)) return ''

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 1500)

  try {
    const response = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, {
      signal: controller.signal,
    })

    if (!response.ok) return ''

    const payload: any = await response.json()
    if (!payload?.success) return ''

    const parts = [payload.city, payload.region, payload.country]
      .map((part) => (typeof part === 'string' ? part.trim() : ''))
      .filter(Boolean)

    return parts.length ? parts.join(', ') : ''
  } catch {
    return ''
  } finally {
    clearTimeout(timeoutId)
  }
}

const resolveSessionLocation = async (c: Context) => {
  const headerLocation = getRequestLocation(c)
  if (headerLocation) return headerLocation

  const ipLocation = await lookupLocationFromIp(getClientIp(c))
  return ipLocation || 'Unknown location'
}

const normalizeEmail = (email: unknown) =>
  typeof email === 'string' ? email.trim() : ''

const passwordMeetsPolicy = (password: string) =>
  password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password)

const getRegistrationConflict = async (email: string) => {
  const [existingUsers]: any = await db.execute(
    'SELECT id FROM users WHERE email = ? LIMIT 1',
    [email]
  )
  const [pendingUsers]: any = await db.execute(
    'SELECT email FROM pending_registrations WHERE email = ? LIMIT 1',
    [email]
  )

  return Boolean(existingUsers.length || pendingUsers.length)
}

const isValidEmail = (email: string) => /.+@.+\..+/.test(email)

const normalizeOptionalField = (value: unknown) => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

const buildUserProfilePayload = (user: {
  id: number
  name: string
  fullName?: string | null
  username?: string | null
  email: string
  phoneNumber?: string | null
  bio?: string | null
  picture?: string | null
  role?: string
  isDisabled?: boolean
}) => ({
  id: user.id,
  name: user.fullName || user.name,
  fullName: user.fullName || user.name,
  username: user.username || null,
  email: user.email,
  phoneNumber: user.phoneNumber || null,
  bio: user.bio || null,
  picture: user.picture || null,
  role: user.role,
  isDisabled: user.isDisabled,
})

const getActiveUserFromAuthHeader = async (c: Context) => {
  const authHeader = c.req.header('Authorization')
  const cookieToken = getCookie(c, USER_SESSION_COOKIE)
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : cookieToken

  if (!token) {
    return { error: c.json({ message: 'No token provided' }, 401) }
  }

  const payload = verifyToken(token)
  if (!payload || !payload.sid) {
    return { error: c.json({ message: 'Invalid token' }, 401) }
  }

  const sessionHash = hashSessionToken(payload.sid)

  const [rows]: any = await db.execute(
    `
    SELECT
      u.id,
      COALESCE(u.full_name, u.name) AS name,
      COALESCE(u.full_name, u.name) AS fullName,
      u.username,
      u.email,
      u.phone_number AS phoneNumber,
      u.bio,
      u.picture,
      u.role,
      u.is_disabled AS isDisabled,
      s.id AS sessionId,
      s.remember_me AS rememberMe,
      s.expires_at AS sessionExpiresAt
    FROM user_sessions s
    INNER JOIN users u ON u.id = s.user_id
    WHERE s.session_hash = ?
      AND s.revoked_at IS NULL
      AND s.expires_at > NOW()
    LIMIT 1
    `,
    [sessionHash]
  )

  if (!rows.length) {
    return { error: c.json({ message: 'Session expired' }, 401) }
  }

  const user = rows[0]
  if (user.isDisabled) {
    if (user.sessionId) {
      await db.execute(
        "UPDATE user_sessions SET revoked_at = NOW(), status = 'Logged Out' WHERE id = ? AND revoked_at IS NULL",
        [user.sessionId]
      )
    }
    return {
      error: c.json(
        { message: 'Your account access has been disabled. Please contact the administrator.' },
        403
      ),
    }
  }

  if (user.sessionId) {
    await db.execute('UPDATE user_sessions SET last_used_at = NOW() WHERE id = ?', [user.sessionId])
  }

  return {
    user: buildUserProfilePayload(user),
    session: {
      id: user.sessionId,
      rememberMe: Boolean(user.rememberMe),
      expiresAt: user.sessionExpiresAt,
    },
  }
}

const issueUserSession = async (c: Context, userId: number, remember = false) => {
  const sessionToken = createSessionToken()
  const signedToken = createToken(userId, remember, sessionToken)
  const userAgent = c.req.header('user-agent') || null
  const sessionMetadata = {
    deviceName: getDeviceName(userAgent),
    browserName: getBrowserName(userAgent),
    location: await resolveSessionLocation(c),
    loginAtIst: formatSessionDateIst(),
  }

  await db.execute(
    `
    INSERT INTO user_sessions (
      user_id,
      session_hash,
      remember_me,
      expires_at,
      user_agent,
      ip_address,
      device_name,
      browser_name,
      location,
      login_at_ist,
      status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      userId,
      hashSessionToken(sessionToken),
      remember,
      getSessionExpiry(remember),
      userAgent,
      getClientIp(c),
      sessionMetadata.deviceName,
      sessionMetadata.browserName,
      sessionMetadata.location,
      sessionMetadata.loginAtIst,
      'Active Now',
    ]
  )

  setCookie(
    c,
    USER_SESSION_COOKIE,
    signedToken,
    sessionCookieOptions(remember ? USER_SESSION_REMEMBER_MAX_AGE : undefined),
  )

  return signedToken
}

export const register = async (c: Context) => {
  const body = await c.req.json()
  const { name, email, password } = body
  const normalizedEmail = normalizeEmail(email)

  if (!name || !normalizedEmail || !password) {
    return c.json({ message: 'All fields are required' }, 400)
  }

  if (await getRegistrationConflict(normalizedEmail)) {
    return c.json({ message: 'Email already registered' }, 409)
  }

  const hashed = await hashPassword(password)
  const otp = generateOTP()

  await db.execute(
    `
    INSERT INTO pending_registrations (email, name, password)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE
      name = VALUES(name),
      password = VALUES(password)
    `,
    [normalizedEmail, name, hashed]
  )

  await db.execute(
    'INSERT INTO otp_codes (email, otp, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 7 MINUTE))',
    [normalizedEmail, otp]
  )

  const sent = await sendOTPEmail(normalizedEmail, otp)
  if (!sent) {
    await db.execute('DELETE FROM otp_codes WHERE email = ?', [normalizedEmail])
    await db.execute('DELETE FROM pending_registrations WHERE email = ?', [normalizedEmail])
    return c.json({ message: 'Failed to send OTP email' }, 500)
  }

  return c.json({ message: 'OTP sent to your email' })
}

export const checkEmail = async (c: Context) => {
  const normalizedEmail = normalizeEmail(c.req.query('email'))

  if (!normalizedEmail) {
    return c.json({ message: 'Email is required' }, 400)
  }

  const exists = await getRegistrationConflict(normalizedEmail)

  return c.json({ exists })
}

export const sendOtp = async (c: Context) => {
  const body = await c.req.json()
  const { email } = body

  if (!email) return c.json({ message: 'Email is required' }, 400)

  const [verifiedRows]: any = await db.execute(
    'SELECT id FROM users WHERE email = ? AND is_verified = true', [email]
  )
  const [pendingRows]: any = await db.execute(
    'SELECT email FROM pending_registrations WHERE email = ?', [email]
  )
  if (!verifiedRows.length && !pendingRows.length) {
    return c.json({ message: 'No registration found for this email' }, 404)
  }

  const otp = generateOTP()

  await db.execute(
    'INSERT INTO otp_codes (email, otp, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 7 MINUTE))',
    [email, otp]
  )

  const sent = await sendOTPEmail(email, otp)
  if (!sent) {
    await db.execute('DELETE FROM otp_codes WHERE email = ?', [email])
    return c.json({ message: 'Failed to send OTP email' }, 500)
  }

  return c.json({ message: 'OTP sent' })
}

export const verifyOtp = async (c: Context) => {
  const body = await c.req.json()
  const { email, otp } = body

  const [rows]: any = await db.execute(
    'SELECT * FROM otp_codes WHERE email = ? AND otp = ? AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
    [email, otp]
  )

  if (!rows.length) {
    return c.json({ message: 'Invalid or expired OTP' }, 400)
  }

  const [pendingRows]: any = await db.execute(
    'SELECT name, password FROM pending_registrations WHERE email = ?',
    [email]
  )

  if (!pendingRows.length) {
    return c.json({ message: 'Registration details not found' }, 404)
  }

  const pendingUser = pendingRows[0]

  const [existingUsers]: any = await db.execute(
    'SELECT id FROM users WHERE email = ?',
    [email]
  )

  if (existingUsers.length) {
    await db.execute('DELETE FROM pending_registrations WHERE email = ?', [email])
    await db.execute('DELETE FROM otp_codes WHERE email = ?', [email])
    return c.json({ message: 'Email already registered' }, 409)
  }

  const [result]: any = await db.execute(
    'INSERT INTO users (full_name, name, email, password, role, auth_provider, is_verified) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [pendingUser.name, pendingUser.name, email, pendingUser.password, 'user', 'email', true]
  )

  await db.execute('DELETE FROM pending_registrations WHERE email = ?', [email])
  await db.execute(
    'DELETE FROM otp_codes WHERE email = ?', [email]
  )

  const token = await issueUserSession(c, result.insertId)
  return c.json({ message: 'Verified', token })
}

export const login = async (c: Context) => {
  const body = await c.req.json()
  const { email, password } = body
  const remember = body.remember === true || body.remember === 'true'

  if (!email || !password) {
    return c.json({ message: 'Email and password are required' }, 400)
  }

  const [rows]: any = await db.execute(
    'SELECT * FROM users WHERE email = ?', [email]
  )

  if (!rows.length) return c.json({ message: 'User not found' }, 404)

  const user = rows[0]
  if (user.is_disabled) {
    return c.json({ message: 'Your account access has been disabled. Please contact the administrator.' }, 403)
  }
  if (user.auth_provider === 'google' && !user.password) {
    return c.json({ message: 'Please sign in with Google' }, 403)
  }
  const valid = await comparePassword(password, user.password)
  if (!valid) return c.json({ message: 'Incorrect password' }, 401)
  if (!user.is_verified) return c.json({ message: 'Email not verified' }, 403)

  const token = await issueUserSession(c, user.id, remember)

  return c.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  })
}



export const googleLogin = async (c: Context) => {
  try {
    if (!googleClient) {
      return c.json(
        { message: 'Google login is not configured' },
        500
      )
    }

    const body = await c.req.json()

    const { credential } = body
    const remember = body.remember === true || body.remember === 'true'

    if (!credential) {
      return c.json(
        { message: 'Google credential is required' },
        400
      )
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: googleClientId,
    })

    const payload = ticket.getPayload() as any

    const email = payload?.email
    const emailVerified = payload?.email_verified
    const googleSub = payload?.sub
    const name =
      payload?.name ||
      payload?.given_name ||
      'Google User'

    const picture = payload?.picture

    if (!email || !emailVerified || !googleSub) {
      return c.json(
        { message: 'Invalid Google account' },
        401
      )
    }

    
    const [rows]: any = await db.execute(
      `
      SELECT id, password, auth_provider, is_disabled
      FROM users
      WHERE email = ? OR google_sub = ?
      LIMIT 1
      `,
      [email, googleSub]
    )

    
    if (rows.length) {
      const user = rows[0]

      if (user.is_disabled) {
        return c.json(
          { message: 'Your account access has been disabled. Please contact the administrator.' },
          403
        )
      }

      await db.execute(
        `
        UPDATE users
        SET
          name = ?,
          google_sub = ?,
          auth_provider = ?,
          is_verified = true
        WHERE id = ?
        `,
        [
          name,
          googleSub,
          user.password ? 'email' : 'google',
          user.id
        ]
      )

      const token = await issueUserSession(c, user.id, remember)

      return c.json({
        token,
        user: {
          id: user.id,
          name,
          email,
          picture
        }
      })
    }

    
    const [result]: any = await db.execute(
      `
      INSERT INTO users (
        full_name,
        name,
        email,
        password,
        role,
        auth_provider,
        google_sub,
        is_verified
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        name,
        name,
        email,
        null,
        'user',
        'google',
        googleSub,
        true
      ]
    )

    const token = await issueUserSession(c, result.insertId, remember)

    return c.json({
        token,
      user: {
        id: result.insertId,
        name,
        email,
        picture
      }
    })

  } catch (error) {
    console.log("GOOGLE LOGIN ERROR:", error)

    return c.json(
      {
        message: 'Google login failed',
        error: error instanceof Error
          ? error.message
          : 'Unknown error'
      },
      401
    )
  }
}
export const getUser = async (c: Context) => {
  const authResult = await getActiveUserFromAuthHeader(c)
  if (authResult.error) {
    return authResult.error
  }

  return c.json({ user: authResult.user })
}

export const updateUserProfile = async (c: Context) => {
  const authResult = await getActiveUserFromAuthHeader(c)
  if (authResult.error) {
    return authResult.error
  }

  const body = await c.req.json()
  const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : ''
  const username = typeof body.username === 'string' ? body.username.trim() : ''
  const email = typeof body.email === 'string' ? body.email.trim() : ''
  const phoneNumber = normalizeOptionalField(body.phoneNumber)
  const bio = normalizeOptionalField(body.bio)
  const picture =
    body.picture === null
      ? null
      : typeof body.picture === 'string'
        ? body.picture.trim() || null
        : undefined

  if (!fullName || !username || !email) {
    return c.json({ message: 'Full name, username, and email are required.' }, 400)
  }

  if (!isValidEmail(email)) {
    return c.json({ message: 'Enter a valid email address.' }, 400)
  }

  const [conflictRows]: any = await db.execute(
    `
    SELECT id
    FROM users
    WHERE id <> ?
      AND (email = ? OR username = ?)
    LIMIT 1
    `,
    [authResult.user.id, email, username]
  )

  if (conflictRows.length) {
    return c.json({ message: 'Email or username is already in use.' }, 409)
  }

  await db.execute(
    `
    UPDATE users
    SET
      full_name = ?,
      name = ?,
      username = ?,
      email = ?,
      phone_number = ?,
      bio = ?,
      picture = ?
    WHERE id = ?
    `,
    [
      fullName,
      fullName,
      username,
      email,
      phoneNumber,
      bio,
      picture === undefined ? authResult.user.picture || null : picture,
      authResult.user.id,
    ]
  )

  if (authResult.session?.id) {
    await db.execute('UPDATE user_sessions SET last_used_at = NOW() WHERE id = ?', [authResult.session.id])
  }

  const updatedUser = buildUserProfilePayload({
    ...authResult.user,
    name: fullName,
    fullName,
    username,
    email,
    phoneNumber,
    bio,
    picture: picture === undefined ? authResult.user.picture || null : picture,
  })

  return c.json({
    message: 'Profile updated successfully.',
    user: updatedUser,
  })
}

export const listUserSessions = async (c: Context) => {
  const authResult = await getActiveUserFromAuthHeader(c)
  if (authResult.error) {
    return authResult.error
  }

  const [rows]: any = await db.execute(
    `
    SELECT
      id,
      device_name AS deviceName,
      browser_name AS browserName,
      location,
      login_at_ist AS loginAtIst,
      status,
      revoked_at AS revokedAt,
      expires_at AS expiresAt,
      created_at AS createdAt
    FROM user_sessions
    WHERE user_id = ?
    ORDER BY created_at DESC, id DESC
    `,
    [authResult.user.id]
  )

  const sessions = rows.map((session: any) => {
    const isRevoked = Boolean(session.revokedAt)
    const expiresAt = session.expiresAt ? new Date(session.expiresAt) : null
    const isExpired = expiresAt ? expiresAt.getTime() <= Date.now() : false

    return {
      id: session.id,
      deviceName: session.deviceName || 'Unknown device',
      browserName: session.browserName || 'Unknown browser',
      location: session.location || 'Unknown location',
      loginAtIst:
        session.loginAtIst ||
        (session.createdAt ? formatSessionDateIst(new Date(session.createdAt)) : 'Unknown time'),
      status: isRevoked || isExpired ? 'Logged Out' : session.status || 'Active Now',
    }
  })

  return c.json({ sessions })
}

export const logout = async (c: Context) => {
  const authHeader = c.req.header('Authorization')
  const cookieToken = getCookie(c, USER_SESSION_COOKIE)
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : cookieToken

  if (token) {
    const payload = verifyToken(token)
    if (payload?.sid) {
      await db.execute(
        "UPDATE user_sessions SET revoked_at = NOW(), status = 'Logged Out' WHERE session_hash = ? AND revoked_at IS NULL",
        [hashSessionToken(payload.sid)]
      )
    }
  }

  deleteCookie(c, USER_SESSION_COOKIE, clearSessionCookieOptions())
  return c.json({ message: 'Logged out' })
}

export const forgotPassword = async (c: Context) => {
  const body = await c.req.json()
  const { email } = body
  const normalizedEmail = typeof email === 'string' ? email.trim() : ''

  if (!normalizedEmail) return c.json({ message: 'Email is required' }, 400)

  const [rows]: any = await db.execute(
    'SELECT id FROM users WHERE email = ?', [normalizedEmail]
  )

  if (!rows.length) {
    return c.json({ message: 'If an account exists, a reset link has been sent.' })
  }

  const token = crypto.randomBytes(32).toString('hex')
  const tokenHash = hashResetToken(token)
  const resetUrl = `${frontendUrl}/reset-password/${token}`

  await db.execute(
    'DELETE FROM password_reset_tokens WHERE email = ?',
    [normalizedEmail]
  )

  await db.execute(
    'INSERT INTO password_reset_tokens (email, token_hash, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE))',
    [normalizedEmail, tokenHash]
  )

  const sent = await sendPasswordResetEmail(normalizedEmail, resetUrl)
  if (!sent) {
    await db.execute(
      'DELETE FROM password_reset_tokens WHERE token_hash = ?',
      [tokenHash]
    )
    return c.json({ message: 'Failed to send reset link' }, 500)
  }

  return c.json({ message: 'If an account exists, a reset link has been sent.' })
}

export const resetPassword = async (c: Context) => {
  const body = await c.req.json()
  const { token, newPassword } = body
  const normalizedToken = typeof token === 'string' ? token.trim() : ''
  const normalizedPassword = typeof newPassword === 'string' ? newPassword : ''

  if (!normalizedToken || !normalizedPassword) {
    return c.json({ message: 'Missing fields' }, 400)
  }

  if (normalizedPassword.length < 8) {
    return c.json({ message: 'Password must be at least 8 characters long' }, 400)
  }

  const tokenHash = hashResetToken(normalizedToken)

  const [rows]: any = await db.execute(
    'SELECT id, email FROM password_reset_tokens WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
    [tokenHash]
  )
  if (!rows.length) return c.json({ message: 'Invalid or expired link' }, 400)

  const resetRecord = rows[0]

  const hashed = await hashPassword(normalizedPassword)
  await db.execute('UPDATE users SET password = ? WHERE email = ?', [hashed, resetRecord.email])
  await db.execute('UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ?', [resetRecord.id])
  await db.execute('DELETE FROM password_reset_tokens WHERE email = ?', [resetRecord.email])
  await db.execute(
    "UPDATE user_sessions SET revoked_at = NOW(), status = 'Logged Out' WHERE user_id = (SELECT id FROM users WHERE email = ?) AND revoked_at IS NULL",
    [resetRecord.email]
  )

  return c.json({ message: 'Password updated successfully' })
}

export const updatePassword = async (c: Context) => {
  const authResult = await getActiveUserFromAuthHeader(c)
  if (authResult.error) {
    return authResult.error
  }

  const body = await c.req.json()
  const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : ''
  const newPassword = typeof body.newPassword === 'string' ? body.newPassword : ''

  if (!currentPassword || !newPassword) {
    return c.json({ message: 'All password fields are required.' }, 400)
  }

  if (!passwordMeetsPolicy(newPassword)) {
    return c.json(
      {
        message:
          'You must create a password with at least 8 characters and include uppercase, lowercase, and a number.',
      },
      400,
    )
  }

  const [rows]: any = await db.execute(
    'SELECT id, password FROM users WHERE id = ? LIMIT 1',
    [authResult.user.id],
  )

  if (!rows.length) {
    return c.json({ message: 'User not found' }, 404)
  }

  const user = rows[0]
  const hasPassword = typeof user.password === 'string' && user.password.length > 0
  if (!hasPassword) {
    return c.json({ message: 'Current password is incorrect' }, 401)
  }

  const isValid = await comparePassword(currentPassword, user.password)
  if (!isValid) {
    return c.json({ message: 'Current password is incorrect' }, 401)
  }

  const hashedPassword = await hashPassword(newPassword)
  await db.execute('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, user.id])

  if (authResult.session?.id) {
    await db.execute(
      "UPDATE user_sessions SET revoked_at = NOW(), status = 'Logged Out' WHERE user_id = ? AND id <> ? AND revoked_at IS NULL",
      [user.id, authResult.session.id],
    )
  }

  await db.execute(
    'UPDATE user_sessions SET last_used_at = NOW() WHERE id = ?',
    [authResult.session?.id],
  )

  return c.json({ message: 'Password updated successfully' })
}

export const createUser = async (c: Context) => {
  const authResult = await getActiveUserFromAuthHeader(c)
  if (authResult.error) {
    return authResult.error
  }

  const body = await c.req.json()
  const { name, email, password } = body

  if (!name || !email || !password) {
    return c.json({ message: 'All fields are required' }, 400)
  }

  const [existing]: any = await db.execute(
    'SELECT id FROM users WHERE email = ?', [email]
  )
  const [pendingExisting]: any = await db.execute(
    'SELECT email FROM pending_registrations WHERE email = ?', [email]
  )
  if (existing.length || pendingExisting.length) {
    return c.json({ message: 'Email already registered' }, 409)
  }

  const hashed = await hashPassword(password)
  const otp = generateOTP()

  await db.execute(
    `
    INSERT INTO pending_registrations (email, name, password)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE
      name = VALUES(name),
      password = VALUES(password)
    `,
    [email, name, hashed]
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

  return c.json({ message: 'OTP sent to email for verification' })
}

export const listUsers = async (c: Context) => {
  const authResult = await getActiveUserFromAuthHeader(c)
  if (authResult.error) {
    return authResult.error
  }

  const [rows]: any = await db.execute(
    'SELECT id, COALESCE(full_name, name) AS name, COALESCE(full_name, name) AS fullName, email, role, created_at AS createdAt, is_verified AS isVerified, is_disabled AS isDisabled FROM users ORDER BY id DESC'
  )

  return c.json({ users: rows })
}

export const enableUser = async (c: Context) => {
  const authResult = await getActiveUserFromAuthHeader(c)
  if (authResult.error) {
    return authResult.error
  }

  const id = Number(c.req.param('id'))
  if (!Number.isInteger(id) || id <= 0) {
    return c.json({ message: 'Invalid user id' }, 400)
  }

  const [result]: any = await db.execute(
    'UPDATE users SET is_disabled = false, is_verified = true WHERE id = ?',
    [id]
  )

  if (!result?.affectedRows) {
    return c.json({ message: 'User not found' }, 404)
  }

  return c.json({ message: 'User enabled', id })
}

export const disableUser = async (c: Context) => {
  const authResult = await getActiveUserFromAuthHeader(c)
  if (authResult.error) {
    return authResult.error
  }

  const id = Number(c.req.param('id'))
  if (!Number.isInteger(id) || id <= 0) {
    return c.json({ message: 'Invalid user id' }, 400)
  }

  const [result]: any = await db.execute(
    'UPDATE users SET is_disabled = true, is_verified = false WHERE id = ?',
    [id]
  )

  await db.execute(
    "UPDATE user_sessions SET revoked_at = NOW(), status = 'Logged Out' WHERE user_id = ? AND revoked_at IS NULL",
    [id]
  )

  if (!result?.affectedRows) {
    return c.json({ message: 'User not found' }, 404)
  }

  return c.json({ message: 'User disabled', id })
}

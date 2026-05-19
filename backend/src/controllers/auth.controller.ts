import { Context } from 'hono'
import { OAuth2Client } from 'google-auth-library'
import { db } from '../config/db'
import { generateOTP } from '../utils/generateOTP'
import { hashPassword, comparePassword } from '../utils/hash'
import { createToken, verifyToken } from '../utils/jwt'
import { sendOTPEmail } from '../utils/mailer'

const googleClientId = process.env.GOOGLE_CLIENT_ID || ''
const googleClient = googleClientId ? new OAuth2Client(googleClientId) : null

const logGooglePayload = (payload: any) => {
  console.log({
    email_verified: payload?.email_verified,
    nbf: payload?.nbf,
    name: payload?.name,
    picture: payload?.picture,
    given_name: payload?.given_name,
    family_name: payload?.family_name,
    iat: payload?.iat,
    exp: payload?.exp,
    jti: payload?.jti,
  })
}

const logAuthProfile = (profile: {
  email: string
  name: string
  picture?: string | null
  provider: string
  emailVerified: boolean
  extra?: Record<string, unknown>
}) => {
  console.log({
    email: profile.email,
    name: profile.name,
    picture: profile.picture,
    auth_provider: profile.provider,
    emailVerified: profile.emailVerified,
    ...(profile.extra || {}),
  })
}

export const register = async (c: Context) => {
  const body = await c.req.json()
  const { name, email, password } = body

  if (!name || !email || !password) {
    return c.json({ message: 'All fields are required' }, 400)
  }

  const [existing]: any = await db.execute(
    'SELECT id FROM users WHERE email = ?', [email]
  )
  if (existing.length) {
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

  console.log('Registration OTP sent')
  logAuthProfile({
    email,
    name,
    provider: 'email',
    emailVerified: false,
    extra: {
      pendingVerification: true,
      otpStatus: 'sent',
    },
  })

  return c.json({ message: 'OTP sent to your email' })
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
    'INSERT INTO users (name, email, password, auth_provider, is_verified) VALUES (?, ?, ?, ?, ?)',
    [pendingUser.name, email, pendingUser.password, 'email', true]
  )

  await db.execute('DELETE FROM pending_registrations WHERE email = ?', [email])
  await db.execute(
    'DELETE FROM otp_codes WHERE email = ?', [email]
  )

  const token = createToken(result.insertId)
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
  if (user.auth_provider === 'google' && !user.password) {
    return c.json({ message: 'Please sign in with Google' }, 403)
  }
  const valid = await comparePassword(password, user.password)
  if (!valid) return c.json({ message: 'Incorrect password' }, 401)
  if (!user.is_verified) return c.json({ message: 'Email not verified' }, 403)

  const token = createToken(user.id, remember)

  console.log('Email login success')
  logAuthProfile({
    email: user.email,
    name: user.name,
    picture: user.picture || null,
    provider: user.auth_provider || 'email',
    emailVerified: Boolean(user.is_verified),
    extra: {
      remember,
      userId: user.id,
    },
  })

  return c.json({ token })
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
      SELECT id, password, auth_provider
      FROM users
      WHERE email = ? OR google_sub = ?
      LIMIT 1
      `,
      [email, googleSub]
    )

    
    if (rows.length) {
      const user = rows[0]

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

      logGooglePayload(payload)
      logAuthProfile({
        email,
        name,
        picture,
        provider: 'google',
        emailVerified: true,
        extra: {
          googleSub,
          userId: user.id,
        },
      })
      console.log("Existing user logged in")

      return c.json({
        token: createToken(user.id),
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
        name,
        email,
        password,
        auth_provider,
        google_sub,
        is_verified
      )
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        name,
        email,
        null,
        'google',
        googleSub,
        true
      ]
    )

    logGooglePayload(payload)
    logAuthProfile({
      email,
      name,
      picture,
      provider: 'google',
      emailVerified: true,
      extra: {
        googleSub,
        userId: result.insertId,
      },
    })
    console.log("New Google user created")

    return c.json({
        token: createToken(result.insertId),
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
  const authHeader = c.req.header('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ message: 'No token provided' }, 401)
  }

  const token = authHeader.slice(7)
  const payload = verifyToken(token)
  if (!payload) {
    return c.json({ message: 'Invalid token' }, 401)
  }

  const [rows]: any = await db.execute(
    'SELECT id, name, email FROM users WHERE id = ?', [payload.id]
  )

  if (!rows.length) {
    return c.json({ message: 'User not found' }, 404)
  }

  return c.json({ user: rows[0] })
}

export const forgotPassword = async (c: Context) => {
  const body = await c.req.json()
  const { email } = body
  if (!email) return c.json({ message: 'Email is required' }, 400)

  const [rows]: any = await db.execute(
    'SELECT id FROM users WHERE email = ?', [email]
  )
  if (!rows.length) return c.json({ message: 'No user found' }, 404)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS password_resets (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      token VARCHAR(255) NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX (email)
    )
  `)

  const otp = generateOTP()

  await db.execute(
    'INSERT INTO password_resets (email, token, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 30 MINUTE))',
    [email, otp]
  )

  await sendOTPEmail(email, otp)
  console.log('Password reset code sent')
  return c.json({ message: 'Password reset code sent' })
}

export const resetPassword = async (c: Context) => {
  const body = await c.req.json()
  const { email, token, newPassword } = body
  if (!email || !token || !newPassword) return c.json({ message: 'Missing fields' }, 400)

  const [rows]: any = await db.execute(
    'SELECT * FROM password_resets WHERE email = ? AND token = ? AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
    [email, token]
  )
  if (!rows.length) return c.json({ message: 'Invalid or expired code' }, 400)

  const hashed = await hashPassword(newPassword)
  await db.execute('UPDATE users SET password = ? WHERE email = ?', [hashed, email])
  await db.execute('DELETE FROM password_resets WHERE email = ?', [email])

  return c.json({ message: 'Password updated' })
}

export const createUser = async (c: Context) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ message: 'No token provided' }, 401)
  }
  const token = authHeader.slice(7)
  const payload = verifyToken(token)
  if (!payload) return c.json({ message: 'Invalid token' }, 401)

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
  const authHeader = c.req.header('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ message: 'No token provided' }, 401)
  }

  const token = authHeader.slice(7)
  const payload = verifyToken(token)
  if (!payload) return c.json({ message: 'Invalid token' }, 401)

  const [rows]: any = await db.execute(
    'SELECT id, name, email, created_at AS createdAt, is_verified FROM users ORDER BY id DESC'
  )

  return c.json({ users: rows })
}

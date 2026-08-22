import jwt from 'jsonwebtoken'

const isProduction = process.env.NODE_ENV === 'production'

if (isProduction && !process.env.JWT_SECRET) {
  throw new Error(
    'JWT_SECRET is not set. Refusing to start in production with a hardcoded/default secret — ' +
      'set JWT_SECRET to a long random value before deploying.',
  )
}

if (!isProduction && !process.env.JWT_SECRET) {
  console.warn(
    '[jwt] JWT_SECRET is not set — using an insecure development-only fallback. ' +
      'Set JWT_SECRET in your .env before deploying.',
  )
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-insecure-secret-do-not-use-in-production'

export const createToken = (id: number, remember = false, sessionId?: string) => {
  return jwt.sign({ id, sid: sessionId }, JWT_SECRET, { expiresIn: remember ? '7d' : '1d' })
}

export const verifyToken = (token: string) => {
  try {
    return jwt.verify(token, JWT_SECRET) as { id: number; sid?: string }
  } catch {
    return null
  }
}

export const createAdminToken = (adminId: number) => {
  return jwt.sign({ id: adminId, role: 'admin', scope: 'admin' }, JWT_SECRET, {
    expiresIn: '12h'
  })
}

export const verifyAdminToken = (token: string) => {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as {
      id: number
      role?: string
      scope?: string
    }
    if (payload.role !== 'admin' || payload.scope !== 'admin') {
      return null
    }
    return payload
  } catch {
    return null
  }
}
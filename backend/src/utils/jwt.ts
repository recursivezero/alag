import jwt from 'jsonwebtoken'
import type { JwtPayload } from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'recursive_secret'

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

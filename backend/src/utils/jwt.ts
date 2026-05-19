import jwt from 'jsonwebtoken'
import type { JwtPayload } from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'recursive_secret'

export const createToken = (id: number, remember = false) => {
  return jwt.sign({ id }, JWT_SECRET, { expiresIn: remember ? '30d' : '7d' })
}

export const verifyToken = (token: string) => {
  try {
    return jwt.verify(token, JWT_SECRET) as { id: number }
  } catch {
    return null
  }
}

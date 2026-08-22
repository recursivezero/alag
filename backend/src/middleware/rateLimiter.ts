import { rateLimiter } from 'hono-rate-limiter'
import { getRequestIp } from '../utils/requestIp.js'

export const authRateLimiter = rateLimiter({
  windowMs: 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-7',
  keyGenerator: (c) => getRequestIp(c) || 'unknown-client',
})

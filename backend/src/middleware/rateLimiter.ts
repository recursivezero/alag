import { rateLimiter } from 'hono-rate-limiter'

export const authRateLimiter = rateLimiter({
  windowMs: 60 * 1000, 
  limit: 100,
  standardHeaders: 'draft-7',
  keyGenerator: (c) => {
    const forwardedFor = c.req.header('x-forwarded-for')
    if (forwardedFor) {
      return forwardedFor.split(',')[0].trim()
    }
    const realIp = c.req.header('x-real-ip')
    if (realIp) {
      return realIp
    }
    return 'unknown-client'
  },
})

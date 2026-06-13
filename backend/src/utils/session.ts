export const USER_SESSION_COOKIE = 'auth_token'
export const ADMIN_SESSION_COOKIE = 'admin_token'

const isProduction = process.env.NODE_ENV === 'production'

const parseBool = (v: string | undefined, fallback: boolean) => {
  if (typeof v === 'undefined') return fallback
  return v === '1' || v.toLowerCase() === 'true'
}

const parseSameSite = (v: string | undefined) => {
  if (!v) return 'Lax' as const
  const up = v.toLowerCase()
  if (up === 'strict') return 'Strict' as const
  if (up === 'none') return 'None' as const
  return 'Lax' as const
}

const COOKIE_SECURE_ENV = process.env.COOKIE_SECURE
const COOKIE_SAMESITE_ENV = process.env.COOKIE_SAMESITE
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || undefined
const COOKIE_MAX_AGE_ENV = process.env.COOKIE_MAX_AGE

export const USER_SESSION_MAX_AGE = 60 * 60 * 24
export const USER_SESSION_REMEMBER_MAX_AGE = 60 * 60 * 24 * 7
export const ADMIN_SESSION_MAX_AGE = 60 * 60 * 12

const cookieSecure = (() => {
  // Explicit env override takes precedence
  if (typeof COOKIE_SECURE_ENV !== 'undefined') return parseBool(COOKIE_SECURE_ENV, false)
  // In production require secure; in dev allow false for localhost/http
  return isProduction
})()

const cookieSameSite = parseSameSite(COOKIE_SAMESITE_ENV)

const cookieMaxAgeOverride = (() => {
  if (!COOKIE_MAX_AGE_ENV) return undefined
  const n = Number.parseInt(COOKIE_MAX_AGE_ENV, 10)
  return Number.isFinite(n) ? n : undefined
})()

export const sessionCookieOptions = (maxAge?: number) => {
  const opts: any = {
    path: '/',
    httpOnly: true,
    secure: cookieSecure,
    sameSite: cookieSameSite,
  }
  if (typeof maxAge === 'number') {
    opts.maxAge = typeof cookieMaxAgeOverride === 'number' ? cookieMaxAgeOverride : maxAge
  }
  if (COOKIE_DOMAIN) opts.domain = COOKIE_DOMAIN
  return opts
}

export const clearSessionCookieOptions = () => {
  const opts: any = {
    path: '/',
    httpOnly: true,
    secure: cookieSecure,
    sameSite: cookieSameSite,
    maxAge: 0,
  }
  if (COOKIE_DOMAIN) opts.domain = COOKIE_DOMAIN
  return opts
}
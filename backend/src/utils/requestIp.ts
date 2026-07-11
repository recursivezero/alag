import type { Context } from 'hono'
import { getConnInfo } from '@hono/node-server/conninfo'


const trustProxyHeaders = process.env.TRUST_PROXY === 'true'


export const getRequestIp = (c: Context): string | null => {
  if (trustProxyHeaders) {
    const cfConnectingIp = c.req.header('cf-connecting-ip')
    if (cfConnectingIp) return cfConnectingIp

    const realIp = c.req.header('x-real-ip')
    if (realIp) return realIp

    const forwardedFor = c.req.header('x-forwarded-for')
    if (forwardedFor) return forwardedFor.split(',')[0].trim()
  }

  try {
    const info = getConnInfo(c)
    return info.remote.address || null
  } catch {
    return null
  }
}
import { defineMiddleware } from 'astro:middleware'
import { getApiBaseUrl } from './services/api'

const isAdminEntryPath = (pathname: string) => pathname === '/admin'

const isLegacyUsersPath = (pathname: string) => pathname === '/users'

const isProtectedAdminPath = (pathname: string) =>
  pathname === '/admin/dashboard' ||
  pathname === '/admin/users' ||
  pathname === '/admin/users/new' ||
  pathname === '/admin/information' ||
  pathname === '/admin/admin-information' ||
  pathname === '/admin/waitlist' ||
  pathname === '/admin/settings'

const isProtectedUserPath = (pathname: string) =>
  pathname === '/dashboard' ||
  pathname.startsWith('/dashboard/') ||
  pathname === '/welcome'

const isPublicAuthPath = (pathname: string) =>
  pathname === '/login' || pathname === '/register'

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url
  const cookieHeader = context.request.headers.get('cookie') || ''

  const validateSession = async (path: string) => {
    try {
      const response = await fetch(`${getApiBaseUrl()}${path}`, {
        method: 'GET',
        headers: cookieHeader ? { cookie: cookieHeader } : undefined,
      })

      return {
        ok: response.ok,
        error: false,
      }
    } catch {
      return {
        ok: false,
        error: true,
      }
    }
  }

  if (isPublicAuthPath(pathname)) {
    const session = await validateSession('/user')
    if (session.ok) {
      return context.redirect('/dashboard')
    }
  }

  if (isLegacyUsersPath(pathname)) {
    return context.redirect('/dashboard')
  }

  if (isProtectedUserPath(pathname)) {
    const session = await validateSession('/user')
    if (!session.ok && !session.error) {
      return context.redirect('/login')
    }
  }

  if (isAdminEntryPath(pathname)) {
    const session = await validateSession('/admin/me')
    if (session.ok) {
      return context.redirect('/admin/dashboard')
    }

    return next()
  }

  if (isProtectedAdminPath(pathname)) {
    const session = await validateSession('/admin/me')
    if (!session.ok && !session.error) {
      return context.redirect('/admin')
    }
  }

  return next()
})

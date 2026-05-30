import { getApiBaseUrl } from './api'

const clientAuthStorageKeys = ['token', 'alag-user-profile']

const clearClientAuthState = () => {
  if (typeof window === 'undefined') return

  for (const storage of [window.localStorage, window.sessionStorage]) {
    for (const key of clientAuthStorageKeys) {
      storage.removeItem(key)
    }
  }
}

const clearSessionToken = async (path: string) => {
  if (typeof window === 'undefined') return

  clearClientAuthState()

  try {
    await fetch(`${getApiBaseUrl()}${path}`, {
      method: 'POST',
      credentials: 'include',
      keepalive: true,
    })
  } catch {
    // The caller still handles the UI redirect.
  }
}

export const clearUserSessionToken = () => {
  return clearSessionToken('/logout')
}

export const clearAdminSessionToken = () => {
  return clearSessionToken('/admin/logout')
}

export const validateUserSession = async () => {
  try {
    const res = await fetch(`${getApiBaseUrl()}/user`, {
      method: 'GET',
      credentials: 'include',
    })

    if (res.ok) return true
  } catch {
    // Fall through to the session clear below.
  }

  void clearUserSessionToken()
  return false
}

export const validateAdminSession = async () => {
  try {
    const res = await fetch(`${getApiBaseUrl()}/admin/me`, {
      method: 'GET',
      credentials: 'include',
    })

    if (res.ok) return true
  } catch {
    // Fall through to the session clear below.
  }

  void clearAdminSessionToken()
  return false
}

export const watchUserSession = (
  onLogin: () => void,
  onLogout: () => void,
) => {
  void onLogin
  void onLogout

  return () => undefined
}
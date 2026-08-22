import { getAdminApiBaseUrl, getAuthApiBaseUrl } from './api'

const clientAuthStorageKeys = ['token', 'alag-user-profile']

const clearClientAuthState = () => {
  if (typeof window === 'undefined') return

  for (const storage of [window.localStorage, window.sessionStorage]) {
    for (const key of clientAuthStorageKeys) {
      storage.removeItem(key)
    }
  }
}

const clearSessionToken = async (url: string) => {
  if (typeof window === 'undefined') return

  clearClientAuthState()

  try {
    await fetch(url, {
      method: 'POST',
      credentials: 'include',
      keepalive: true,
    })
  } catch {
  
  }
}

export const clearUserSessionToken = () => {
  return clearSessionToken(`${getAuthApiBaseUrl()}/logout`)
}

export const clearAdminSessionToken = () => {
  return clearSessionToken(`${getAdminApiBaseUrl()}/logout`)
}

export const validateUserSession = async () => {
  try {
    const res = await fetch(`${getAuthApiBaseUrl()}/user`, {
      method: 'GET',
      credentials: 'include',
    })

    if (res.ok) return true
  } catch {
  
  }

  void clearUserSessionToken()
  return false
}

export const validateAdminSession = async () => {
  try {
    const res = await fetch(`${getAdminApiBaseUrl()}/me`, {
      method: 'GET',
      credentials: 'include',
    })

    if (res.ok) return true
  } catch {
    
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
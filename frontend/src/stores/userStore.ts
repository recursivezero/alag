import type { UserProfile } from '../types/user'

const userKey = 'alag-user-profile'

export const getStoredUser = (): UserProfile | null => {
  if (typeof window === 'undefined') return null

  const raw = window.localStorage.getItem(userKey)
  if (!raw) return null

  try {
    return JSON.parse(raw) as UserProfile
  } catch {
    window.localStorage.removeItem(userKey)
    return null
  }
}

export const setStoredUser = (user: UserProfile) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(userKey, JSON.stringify(user))
}

export const clearStoredUser = () => {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(userKey)
}
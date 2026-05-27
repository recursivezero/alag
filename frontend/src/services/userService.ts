import api, { getApiBaseUrl } from './api'
import type { UserProfile } from '../types/user'

type SessionHeaders = {
  cookieHeader?: string
}

const buildHeaders = (headers?: SessionHeaders): HeadersInit => {
  if (!headers?.cookieHeader) return {}

  return {
    cookie: headers.cookieHeader,
  }
}

export const fetchCurrentUser = async (headers?: SessionHeaders) => {
  try {
    const response = await fetch(`${getApiBaseUrl()}/user`, {
      method: 'GET',
      credentials: 'include',
      headers: buildHeaders(headers),
    })

    if (!response.ok) {
      throw new Error('Unable to load current user')
    }

    const data = (await response.json()) as { user: UserProfile }
    return data.user
  } catch {
    return null
  }
}

export const fetchCurrentUserOrGuest = async (headers?: SessionHeaders) => {
  const user = await fetchCurrentUser(headers)

  return (
    user || {
      id: 0,
      name: 'Guest',
      email: '',
      phoneNumber: null,
      picture: null,
      role: 'user',
    }
  ) as UserProfile
}

export const fetchCurrentUserWithApi = async () => {
  const response = await api.get('/user')
  return response.data.user as UserProfile
}
import axios from 'axios'

export const getApiBaseUrl = () => {
  const configured = (import.meta as ImportMeta & {
    env?: { PUBLIC_API_BASE_URL?: string }
  }).env?.PUBLIC_API_BASE_URL?.trim()

  if (configured) {
    return configured.replace(/\/$/, '')
  }

  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:5001/api`
  }

  return 'http://localhost:5001/api'
}

export const getAuthApiBaseUrl = () => `${getApiBaseUrl()}/v1/auth`
export const getPostsApiBaseUrl = () => `${getApiBaseUrl()}/v1/posts`
export const getAdminApiBaseUrl = () => `${getApiBaseUrl()}/v1/admin`

export default axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
})
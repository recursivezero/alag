import axios from 'axios'

const getApiBaseUrl = () => {
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

export default axios.create({
  baseURL: getApiBaseUrl()
})

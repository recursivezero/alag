export const formatRelativeTime = (input: string) => {
  const value = new Date(input).getTime()
  if (Number.isNaN(value)) return ''

  const diffSeconds = Math.max(0, Math.floor((Date.now() - value) / 1000))
  if (diffSeconds < 60) return 'Just now'

  const diffMinutes = Math.floor(diffSeconds / 60)
  if (diffMinutes < 60) return `${diffMinutes} min ago`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours} hr ago`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays} days ago`

  return new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(input))
}

export const formatCounter = (value: number) => {
  if (value >= 1000) {
    return `${Math.round(value / 100) / 10}k`
  }

  return String(value)
}
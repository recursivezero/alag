export type ThemeMode = 'light' | 'dark'

const themeKey = 'alag-user-theme'

const getStoredTheme = (): ThemeMode | null => {
  if (typeof window === 'undefined') return null

  const value = window.localStorage.getItem(themeKey)
  if (value === 'light' || value === 'dark') {
    return value
  }

  return null
}

export const getPreferredTheme = (): ThemeMode => {
  const stored = getStoredTheme()
  if (stored) return stored

  if (typeof window !== 'undefined') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
  }

  return 'dark'
}

export const applyTheme = (theme: ThemeMode) => {
  if (typeof document === 'undefined') return

  document.documentElement.classList.toggle('dark', theme === 'dark')
  document.documentElement.style.colorScheme = theme
  document.documentElement.dataset.theme = theme
}

export const setTheme = (theme: ThemeMode) => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(themeKey, theme)
  }

  applyTheme(theme)
}

export const toggleTheme = () => {
  const nextTheme = document.documentElement.classList.contains('dark')
    ? 'light'
    : 'dark'

  setTheme(nextTheme)
}

export const initializeThemeStore = () => {
  setTheme(getPreferredTheme())
}
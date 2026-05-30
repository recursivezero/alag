export type ThemeMode = 'light' | 'dark' | 'system'
export type AccentColor = 'purple' | 'blue' | 'green' | 'orange' | 'pink'

const themeKey = 'alag-user-theme'
const accentKey = 'alag-user-accent'

let prefersDarkQuery: MediaQueryList | null = null
let prefersDarkListenerAttached = false

const getStoredValue = <T extends string>(
  key: string,
  allowedValues: readonly T[],
): T | null => {
  if (typeof window === 'undefined') return null

  const value = window.sessionStorage.getItem(key)
  return allowedValues.includes(value as T) ? (value as T) : null
}

const getStoredTheme = (): ThemeMode | null => {
  return getStoredValue(themeKey, ['light', 'dark', 'system'])
}

const getStoredAccent = (): AccentColor | null => {
  return getStoredValue(accentKey, [
    'purple',
    'blue',
    'green',
    'orange',
    'pink',
  ])
}

const resolveThemeMode = (theme: ThemeMode): 'light' | 'dark' => {
  if (theme === 'light' || theme === 'dark') return theme

  if (typeof window !== 'undefined') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
  }

  return 'dark'
}

const syncThemeAttributes = (themeMode: ThemeMode, accent: AccentColor) => {
  if (typeof document === 'undefined') return

  const effectiveTheme = resolveThemeMode(themeMode)
  const root = document.documentElement

  root.classList.toggle('dark', effectiveTheme === 'dark')
  root.style.colorScheme = effectiveTheme
  root.dataset.theme = effectiveTheme
  root.dataset.themeMode = themeMode
  root.dataset.accentColor = accent
}

const dispatchThemeChange = () => {
  if (typeof document === 'undefined') return

  document.dispatchEvent(new CustomEvent('alag-theme-change'))
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

export const getPreferredAccent = (): AccentColor => {
  return getStoredAccent() ?? 'purple'
}

export const applyTheme = (theme: ThemeMode) => {
  syncThemeAttributes(theme, getPreferredAccent())
  dispatchThemeChange()
}

export const applyAccent = (accent: AccentColor) => {
  syncThemeAttributes(getPreferredTheme(), accent)
  dispatchThemeChange()
}

export const setTheme = (theme: ThemeMode) => {
  if (typeof window !== 'undefined') {
    window.sessionStorage.setItem(themeKey, theme)
  }

  applyTheme(theme)
}

export const setAccent = (accent: AccentColor) => {
  if (typeof window !== 'undefined') {
    window.sessionStorage.setItem(accentKey, accent)
  }

  applyAccent(accent)
}

export const toggleTheme = () => {
  const currentTheme = resolveThemeMode(getPreferredTheme())
  const nextTheme: ThemeMode = currentTheme === 'dark' ? 'light' : 'dark'

  setTheme(nextTheme)
}

export const initializeThemeStore = () => {
  applyTheme(getPreferredTheme())
  applyAccent(getPreferredAccent())

  if (typeof window === 'undefined' || prefersDarkListenerAttached) return

  prefersDarkQuery = window.matchMedia('(prefers-color-scheme: dark)')
  const storedTheme = getStoredTheme()

  if (storedTheme !== 'system') return

  const syncSystemTheme = () => {
    if (getStoredTheme() === 'system') {
      applyTheme('system')
    }
  }

  if (typeof prefersDarkQuery.addEventListener === 'function') {
    prefersDarkQuery.addEventListener('change', syncSystemTheme)
  } else if (typeof prefersDarkQuery.addListener === 'function') {
    prefersDarkQuery.addListener(syncSystemTheme)
  }

  prefersDarkListenerAttached = true
}
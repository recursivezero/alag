export type RememberedAccount = {
  email: string
  name: string
  picture?: string | null
  role?: string
  lastUsedAt: string
}

const STORAGE_KEY = 'alag:remembered-accounts'

const readStorage = (): RememberedAccount[] => {
  if (typeof window === 'undefined') return []

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(Boolean) : []
  } catch {
    return []
  }
}

const writeStorage = (accounts: RememberedAccount[]) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts))
}

export const getRememberedAccounts = () => readStorage()

export const getPrimaryRememberedAccount = () => readStorage()[0] || null

export const rememberAccount = (account: Omit<RememberedAccount, 'lastUsedAt'>) => {
  const now = new Date().toISOString()
  const nextAccount: RememberedAccount = {
    ...account,
    lastUsedAt: now,
  }

  const accounts = readStorage().filter((stored) => stored.email !== account.email)
  writeStorage([nextAccount, ...accounts].slice(0, 5))
  return nextAccount
}

export const forgetAccount = (email: string) => {
  const accounts = readStorage().filter((stored) => stored.email !== email)
  writeStorage(accounts)
  return accounts
}

export const clearRememberedAccounts = () => {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(STORAGE_KEY)
}

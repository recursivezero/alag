export function isValidMobileNumber(mobile: string): boolean {
  
  return /^\+?[0-9]{10,15}$/.test(mobile.trim())
}

export function normalizeMobile(mobile: string): string {
  return mobile.trim()
}

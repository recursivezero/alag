const smsWorkerUrl = (process.env.SMS_WORKER_URL || '').replace(/\/$/, '')
const isProduction = process.env.NODE_ENV === 'production'

export async function sendMobileOtp(mobile: string, otp: string): Promise<boolean> {
  if (!smsWorkerUrl) {
    if (isProduction) {
      console.error('[SMS] SMS_WORKER_URL is not set in production — cannot send mobile OTP.')
      return false
    }
    console.warn('[SMS] SMS_WORKER_URL is not set — skipping SMS send (dev mode).')
    return true
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10_000)

    const response = await fetch(`${smsWorkerUrl}/send-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
     
        'X-Worker-Secret': process.env.SMS_WORKER_SECRET || '',
      },
      body: JSON.stringify({ mobile, otp }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const body = await response.text()
      console.error('[SMS] Worker returned non-OK status:', response.status, body)
      return false
    }

    return true
  } catch (error) {
    console.error('[SMS] Error calling Worker:', error)
    return false
  }
}

export function isValidMobileNumber(mobile: string): boolean {
  
  return /^\+?[0-9]{10,15}$/.test(mobile.trim())
}

export function normalizeMobile(mobile: string): string {
  return mobile.trim()
}

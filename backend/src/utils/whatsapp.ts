const ULTRAMSG_INSTANCE_ID = process.env.ULTRAMSG_INSTANCE_ID || ''
const ULTRAMSG_TOKEN = process.env.ULTRAMSG_TOKEN || ''
const isProduction = process.env.NODE_ENV === 'production'


function toWhatsAppRecipient(mobile: string): string {
  return mobile.trim().replace(/^\+/, '')
}


export async function sendWhatsAppOTP(phoneNumber: string, otp: string): Promise<boolean> {
  if (!ULTRAMSG_INSTANCE_ID || !ULTRAMSG_TOKEN) {
    if (isProduction) {
      console.error('[WhatsApp] ULTRAMSG_INSTANCE_ID / ULTRAMSG_TOKEN is not set in production — cannot send WhatsApp OTP.')
      return false
    }
    console.warn('[WhatsApp] UltraMsg credentials are not set — skipping WhatsApp send (dev mode).')
    return true
  }

  const to = toWhatsAppRecipient(phoneNumber)
  const body =
    `RecursiveAuth Verification Code\n\n` +
    `Your verification code is: ${otp}\n\n` +
    `Do not share this code with anyone.\n` +
    `This code expires in 5 minutes.`

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10_000)

    const response = await fetch(
      `https://api.ultramsg.com/${ULTRAMSG_INSTANCE_ID}/messages/chat`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: ULTRAMSG_TOKEN,
          to,
          body,
        }),
        signal: controller.signal,
      }
    )

    clearTimeout(timeoutId)

    const result: any = await response.json().catch(() => null)

    if (!response.ok || (result && result.error)) {
      console.error('[WhatsApp] UltraMsg API returned an error:', response.status, result?.error ?? result)
      return false
    }

    return true
  } catch (error) {
    console.error('[WhatsApp] Error calling UltraMsg API:', error)
    return false
  }
}
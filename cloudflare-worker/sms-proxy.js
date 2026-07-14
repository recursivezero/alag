export default {
  async fetch(request, env) {
    
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, X-Worker-Secret',
        },
      })
    }

    const url = new URL(request.url)

    if (request.method === 'POST' && url.pathname === '/send-otp') {
      return handleSendOtp(request, env)
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  },
}

async function handleSendOtp(request, env) {

  const workerSecret = request.headers.get('X-Worker-Secret') || ''
  if (!env.WORKER_SECRET || workerSecret !== env.WORKER_SECRET) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  let body
  try {
    body = await request.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }

  const { mobile, otp } = body

  if (!mobile || !otp) {
    return jsonResponse({ error: 'mobile and otp are required' }, 400)
  }


  if (!/^\+?[0-9]{10,15}$/.test(String(mobile).trim())) {
    return jsonResponse({ error: 'Invalid mobile number format' }, 400)
  }

  if (!env.TWOFACTOR_API_KEY) {
    console.error('[Worker] TWOFACTOR_API_KEY is not configured')
    return jsonResponse({ error: 'SMS provider not configured' }, 500)
  }

  const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown'
  console.log(`[Worker] Sending OTP to ${mobile} (client IP: ${clientIp})`)


  const mobileSanitized = String(mobile).replace(/\D/g, '') 
  const twoFactorUrl = `https://2factor.in/API/V1/${env.TWOFACTOR_API_KEY}/SMS/${mobileSanitized}/${otp}/OTP1`

  try {
    const smsResponse = await fetch(twoFactorUrl, { method: 'GET' })
    const smsData = await smsResponse.json()

    
    if (smsData?.Status === 'Success') {
      return jsonResponse({ message: 'OTP sent successfully' }, 200)
    }

    console.error('[Worker] 2Factor API error:', smsData)
    return jsonResponse({ error: 'Failed to send OTP', details: smsData?.Details }, 502)
  } catch (err) {
    console.error('[Worker] Network error calling 2Factor:', err)
    return jsonResponse({ error: 'SMS provider unreachable' }, 503)
  }
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
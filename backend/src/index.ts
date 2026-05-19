import { Hono } from 'hono'
import 'dotenv/config'
import authRoutes from './routes/auth.routes'
import { createServer, IncomingMessage, ServerResponse } from 'http'
import { URL } from 'url'

const app = new Hono()

app.use('*', async (c, next) => {
  c.header('Access-Control-Allow-Origin', '*')
  c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  c.header(
  'Access-Control-Allow-Headers',
  'Content-Type, Authorization'
)
  if (c.req.method === 'OPTIONS') return c.text('ok')
  await next()
})

app.route('/api', authRoutes)

app.get('/', (c) => {
  return c.text('Server Running')
})

const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  try {
    const url = new URL(req.url || '', `http://${req.headers.host}`)
    const method = req.method || 'GET'
    
    let body = ''
    for await (const chunk of req) {
      body += chunk
    }
    
    const request = new Request(url.toString(), {
      method,
      headers: req.headers as any,
      body: body || undefined
    })
    
    const response = await app.fetch(request)
    
    res.writeHead(response.status, Object.fromEntries(response.headers))
    const buffer = Buffer.from(await response.arrayBuffer())
    res.end(buffer)
  } catch (e) {
    console.error('Server error:', e)
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Internal Server Error' }))
    }
  }
})

const PORT = process.env.PORT ? Number(process.env.PORT) : 5001

server.listen(PORT, () => {
  console.log(`✓ Server running on http://localhost:${PORT}`)
})

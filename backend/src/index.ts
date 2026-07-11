import { OpenAPIHono } from '@hono/zod-openapi'
import 'dotenv/config'
import { serve } from '@hono/node-server'
import adminRoutes from './routes/v1.admin.routes.js'
import postsRoutes from './routes/v1.posts.routes.js'
import authV1Routes from './routes/v1.auth.routes.js'
import { swaggerUI } from '@hono/swagger-ui'
import { registerOpenApiDocs } from './docs/openapi-config.js'
import { db } from './config/db.js'

const frontendOrigin = (
  process.env.FRONTEND_URL || process.env.PUBLIC_FRONTEND_URL || 'http://localhost:4321'
).replace(/\/$/, '')

const app = new OpenAPIHono()

app.use('*', async (c, next) => {
  const requestOrigin = c.req.header('Origin') || ''
  if (!requestOrigin || requestOrigin === frontendOrigin) {
    c.header('Access-Control-Allow-Origin', requestOrigin || frontendOrigin)
  }
  c.header('Vary', 'Origin')
  c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  c.header(
  'Access-Control-Allow-Headers',
  'Content-Type, Authorization'
)
  c.header('Access-Control-Allow-Credentials', 'true')
  if (c.req.method === 'OPTIONS') return c.text('ok')
  await next()
})

app.route('/api/v1/auth', authV1Routes)
app.route('/api/v1/admin', adminRoutes)
app.route('/api/v1/posts', postsRoutes)

registerOpenApiDocs(app)
app.get('/api-docs', swaggerUI({ url: '/api-docs/openapi.json' }))

app.get('/', (c) => {
  return c.text('Server Running')
})

app.notFound((c) => c.json({ message: 'Not found' }, 404))

app.onError((err, c) => {
  console.error('Unhandled request error:', err)
  return c.json({ message: 'Internal Server Error' }, 500)
})

const PORT = process.env.PORT ? Number(process.env.PORT) : 5001

const server = serve(
  {
    fetch: app.fetch,
    port: PORT,
  },
  (info) => {
    console.log(`✓ Server running on http://localhost:${info.port}`)
    console.log(`✓ OpenAPI spec:  http://localhost:${info.port}/api-docs/openapi.json`)
    console.log(`✓ Swagger UI:    http://localhost:${info.port}/api-docs`)
  },
)

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason)
})
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error)
})

const shutdown = async (signal: string) => {
  console.log(`\n${signal} received, shutting down gracefully...`)
  server.close(async (closeErr) => {
    if (closeErr) console.error('Error closing HTTP server:', closeErr)
    try {
      await db.end()
    } catch (error) {
      console.error('Error closing DB pool:', error)
    } finally {
      process.exit(0)
    }
  })
  setTimeout(() => process.exit(1), 10_000).unref()
}

process.on('SIGTERM', () => void shutdown('SIGTERM'))
process.on('SIGINT', () => void shutdown('SIGINT'))
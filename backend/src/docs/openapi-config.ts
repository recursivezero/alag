import type { OpenAPIHono } from '@hono/zod-openapi'

export const openApiDocumentConfig = {
  openapi: '3.0.3',
  info: {
    title: 'alag API',
    version: '1.0.0',
    description:
      'API documentation for the alag backend, generated automatically from Zod route ' +
      'schemas via @hono/zod-openapi. All endpoints are served under /api/v1.',
  },
  servers: [{ url: '/', description: 'Current server' }],
  tags: [
    { name: 'Auth', description: 'Authentication, registration, OTP verification, and account/session management' },
    { name: 'Admin', description: 'Admin-only endpoints' },
    { name: 'Posts', description: 'Post creation, feed, likes, saves, comments, and drafts' },
  ],
}

export const registerOpenApiDocs = (app: OpenAPIHono) => {
  app.doc('/api-docs/openapi.json', openApiDocumentConfig)
}
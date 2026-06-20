export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'alag API',
    version: '1.0.0',
    description:
      'API documentation for the alag backend. Legacy routes are served under /api, ' +
      'and a parallel versioned surface is served under /api/v1.',
  },
  servers: [{ url: '/', description: 'Current server' }],
  tags: [
    { name: 'Auth', description: 'Authentication and user account endpoints' },
    { name: 'Admin', description: 'Admin-only endpoints' },
    { name: 'Posts', description: 'Post creation, feed, likes, saves, comments' },
  ],
  paths: {
    '/api/login': {
      post: {
        tags: ['Auth'],
        summary: 'Log in with email and password (legacy)',
        responses: { '200': { description: 'Login successful' } },
      },
    },
    '/api/v1/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Log in with email and password (v1, rate-limited)',
        description: 'Same behavior as /api/login. Rate limited to 100 requests/minute/IP.',
        responses: {
          '200': { description: 'Login successful' },
          '429': { description: 'Too many requests' },
        },
      },
    },
    '/api/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new account (legacy)',
        responses: { '200': { description: 'Registration successful' } },
      },
    },
    '/api/v1/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new account (v1, rate-limited)',
        description: 'Same behavior as /api/register. Rate limited to 100 requests/minute/IP.',
        responses: {
          '200': { description: 'Registration successful' },
          '429': { description: 'Too many requests' },
        },
      },
    },
    '/api/admin/login': {
      post: {
        tags: ['Admin'],
        summary: 'Admin login (legacy)',
        responses: { '200': { description: 'Login successful' } },
      },
    },
    '/api/v1/admin/login': {
      post: {
        tags: ['Admin'],
        summary: 'Admin login (v1)',
        responses: { '200': { description: 'Login successful' } },
      },
    },
    '/api/posts': {
      get: {
        tags: ['Posts'],
        summary: 'List public posts (legacy)',
        responses: { '200': { description: 'A list of posts' } },
      },
      post: {
        tags: ['Posts'],
        summary: 'Create a post (legacy)',
        responses: { '200': { description: 'Post created' } },
      },
    },
    '/api/v1/posts': {
      get: {
        tags: ['Posts'],
        summary: 'List public posts (v1)',
        responses: { '200': { description: 'A list of posts' } },
      },
      post: {
        tags: ['Posts'],
        summary: 'Create a post (v1)',
        responses: { '200': { description: 'Post created' } },
      },
    },
  },
} as const
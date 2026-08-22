import type { Hook } from '@hono/zod-openapi'

export const jsonMessageHook: Hook<any, any, any, any> = (result, c) => {
  if (result.success === false) {
    const firstIssue = result.error.issues[0]
    return c.json({ message: firstIssue?.message || 'Invalid request' }, 400)
  }
}

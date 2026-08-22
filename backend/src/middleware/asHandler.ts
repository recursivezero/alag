import type { Handler } from 'hono'

export const asHandler = <H extends (...args: any[]) => any>(
  handler: H
): Handler<any, any, any, any> =>
  handler as unknown as Handler<any, any, any, any>

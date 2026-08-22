import { z } from '@hono/zod-openapi'

export const MessageResponseSchema = z
  .object({
    message: z.string().openapi({ example: 'Operation completed successfully' }),
  })
  .openapi('MessageResponse')


export const ErrorResponseSchema = z
  .object({
    message: z.string().openapi({ example: 'Something went wrong' }),
  })
  .openapi('ErrorResponse')

export const IdParamSchema = z.object({
  id: z
    .string()
    .openapi({
      param: { name: 'id', in: 'path' },
      example: '1',
      description: 'Numeric identifier',
    }),
})

export const SlugParamSchema = z.object({
  slug: z
    .string()
    .openapi({
      param: { name: 'slug', in: 'path' },
      example: 'my-first-post',
      description: 'URL-safe post slug',
    }),
})
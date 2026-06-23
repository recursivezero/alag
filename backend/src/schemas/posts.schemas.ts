import { z } from '@hono/zod-openapi'

export const PostAuthorSchema = z
  .object({
    id: z.number().openapi({ example: 1 }),
    name: z.string().nullable().openapi({ example: 'Jane Doe' }),
    fullName: z.string().nullable().openapi({ example: 'Jane Doe' }),
    email: z.string().nullable().openapi({ example: 'jane@example.com' }),
    phoneNumber: z.string().nullable().openapi({ example: null }),
    picture: z.string().nullable().openapi({ example: null }),
    username: z.string().nullable().optional().openapi({ example: 'janedoe' }),
  })
  .openapi('PostAuthor')

export const PostCountsSchema = z
  .object({
    likes: z.number().openapi({ example: 12 }),
    comments: z.number().openapi({ example: 3 }),
    saves: z.number().openapi({ example: 5 }),
  })
  .openapi('PostCounts')

export const PostUserStateSchema = z
  .object({
    liked: z.boolean().openapi({ example: false }),
    saved: z.boolean().openapi({ example: false }),
  })
  .openapi('PostUserState')

export const PostSchema = z
  .object({
    id: z.number().openapi({ example: 42 }),
    slug: z.string().openapi({ example: 'my-first-post-abc123' }),
    title: z.string().nullable().openapi({ example: 'My first post' }),
    caption: z.string().nullable().openapi({ example: 'A beautiful sunset.' }),
    imageUrl: z.string().nullable().openapi({ example: 'https://cdn.example.com/img.jpg' }),
    altText: z.string().nullable().openapi({ example: 'A sunset over the ocean' }),
    category: z.string().nullable().openapi({ example: 'nature' }),
    feedType: z.enum(['public', 'personal']).openapi({ example: 'public' }),
    status: z.string().openapi({ example: 'published' }),
    location: z.string().nullable().openapi({ example: 'Hyderabad, India' }),
    createdAt: z.union([z.string(), z.date()]).openapi({ example: '2026-06-01T10:00:00.000Z' }),
    author: PostAuthorSchema,
    counts: PostCountsSchema,
    userState: PostUserStateSchema.optional(),
  })
  .openapi('Post')

export const ListPostsResponseSchema = z
  .object({
    posts: z.array(PostSchema),
  })
  .openapi('ListPostsResponse')

export const ListPostsQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .openapi({ param: { name: 'limit', in: 'query' }, example: '12' }),
  offset: z
    .string()
    .optional()
    .openapi({ param: { name: 'offset', in: 'query' }, example: '0' }),
  filter: z
    .string()
    .optional()
    .openapi({ param: { name: 'filter', in: 'query' }, example: 'all' }),
})

export const CreatePostRequestSchema = z
  .object({
    imageUrl: z.string().min(1).openapi({ example: 'data:image/png;base64,...' }),
    caption: z.string().min(1).openapi({ example: 'A beautiful sunset.' }),
    altText: z.string().min(1).openapi({ example: 'A sunset over the ocean' }),
    category: z.string().optional().openapi({ example: 'nature' }),
    feedType: z.enum(['public', 'personal']).optional().openapi({ example: 'public' }),
    location: z.string().optional().openapi({ example: 'Hyderabad, India' }),
    draftId: z.number().optional().openapi({ description: 'Publish from an existing draft' }),
  })
  .openapi('CreatePostRequest')

export const CreatePostResponseSchema = z
  .object({
    post: PostSchema,
  })
  .openapi('CreatePostResponse')

export const DraftSchema = z
  .object({
    id: z.number().openapi({ example: 7 }),
    slug: z.string().optional(),
    title: z.string().nullable().optional(),
    caption: z.string().nullable().optional(),
    imageUrl: z.string().nullable().optional(),
    altText: z.string().nullable().optional(),
    category: z.string().nullable().optional(),
    feedType: z.enum(['public', 'personal']).optional(),
    status: z.string().openapi({ example: 'draft' }),
    location: z.string().nullable().optional(),
    createdAt: z.union([z.string(), z.date()]).optional(),
  })
  .openapi('Draft')

export const SaveDraftRequestSchema = z
  .object({
    imageUrl: z.string().optional().openapi({ example: 'data:image/png;base64,...' }),
    caption: z.string().optional().openapi({ example: 'Work in progress...' }),
    altText: z.string().optional(),
    category: z.string().optional(),
    feedType: z.enum(['public', 'personal']).optional(),
    location: z.string().optional(),
  })
  .openapi('SaveDraftRequest')

export const SaveDraftResponseSchema = z
  .object({
    draft: z.object({
      id: z.number().openapi({ example: 7 }),
      status: z.string().openapi({ example: 'draft' }),
    }),
  })
  .openapi('SaveDraftResponse')

export const GetDraftResponseSchema = z
  .object({
    draft: DraftSchema.nullable(),
  })
  .openapi('GetDraftResponse')

export const SuccessFlagResponseSchema = z
  .object({
    success: z.boolean().openapi({ example: true }),
  })
  .openapi('SuccessFlagResponse')

export const GetPostResponseSchema = z
  .object({
    post: PostSchema,
  })
  .openapi('GetPostResponse')

export const ToggleLikeResponseSchema = z
  .object({
    liked: z.boolean().openapi({ example: true }),
    likeCount: z.number().openapi({ example: 13 }),
  })
  .openapi('ToggleLikeResponse')

export const ToggleSaveResponseSchema = z
  .object({
    saved: z.boolean().openapi({ example: true }),
    saveCount: z.number().openapi({ example: 6 }),
  })
  .openapi('ToggleSaveResponse')

export const PaginationQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .openapi({ param: { name: 'limit', in: 'query' }, example: '20' }),
  offset: z
    .string()
    .optional()
    .openapi({ param: { name: 'offset', in: 'query' }, example: '0' }),
})
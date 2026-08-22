import { OpenAPIHono, createRoute } from '@hono/zod-openapi'
import {
  createPost,
  getPostBySlug,
  listMyPosts,
  listPosts,
  deletePost,
  toggleLike,
  getLikedPosts,
  toggleSave,
  getSavedPosts,
  saveDraft,
  getDraft,
  deleteDraft,
} from '../controllers/posts.controller.js'
import { jsonMessageHook } from '../middleware/validationHook.js'
import { asHandler } from '../middleware/asHandler.js'
import { ErrorResponseSchema, SlugParamSchema } from '../schemas/common.schemas.js'
import {
  CreatePostRequestSchema,
  CreatePostResponseSchema,
  GetDraftResponseSchema,
  GetPostResponseSchema,
  ListPostsQuerySchema,
  ListPostsResponseSchema,
  PaginationQuerySchema,
  SaveDraftRequestSchema,
  SaveDraftResponseSchema,
  SuccessFlagResponseSchema,
  ToggleLikeResponseSchema,
  ToggleSaveResponseSchema,
} from '../schemas/posts.schemas.js'

const postsRoutes = new OpenAPIHono({ defaultHook: jsonMessageHook })

postsRoutes.openapi(
  createRoute({
    method: 'get',
    path: '/',
    tags: ['Posts'],
    summary: 'List public posts',
    request: { query: ListPostsQuerySchema },
    responses: {
      200: { content: { 'application/json': { schema: ListPostsResponseSchema } }, description: 'A list of posts' },
    },
  }),
  asHandler(listPosts),
)

postsRoutes.openapi(
  createRoute({
    method: 'get',
    path: '/me',
    tags: ['Posts'],
    summary: "List the authenticated user's personal-feed posts",
    security: [{ bearerAuth: [] }],
    responses: {
      200: { content: { 'application/json': { schema: ListPostsResponseSchema } }, description: 'A list of posts' },
      401: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Unauthorized' },
    },
  }),
  asHandler(listMyPosts),
)

postsRoutes.openapi(
  createRoute({
    method: 'get',
    path: '/liked',
    tags: ['Posts'],
    summary: 'List posts liked by the authenticated user',
    security: [{ bearerAuth: [] }],
    request: { query: PaginationQuerySchema },
    responses: {
      200: { content: { 'application/json': { schema: ListPostsResponseSchema } }, description: 'A list of posts' },
      401: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Unauthorized' },
    },
  }),
  asHandler(getLikedPosts),
)

postsRoutes.openapi(
  createRoute({
    method: 'get',
    path: '/saved',
    tags: ['Posts'],
    summary: 'List posts saved by the authenticated user',
    security: [{ bearerAuth: [] }],
    request: { query: PaginationQuerySchema },
    responses: {
      200: { content: { 'application/json': { schema: ListPostsResponseSchema } }, description: 'A list of posts' },
      401: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Unauthorized' },
    },
  }),
  asHandler(getSavedPosts),
)

postsRoutes.openapi(
  createRoute({
    method: 'get',
    path: '/draft',
    tags: ['Posts'],
    summary: "Get the authenticated user's current draft, if any",
    security: [{ bearerAuth: [] }],
    responses: {
      200: { content: { 'application/json': { schema: GetDraftResponseSchema } }, description: 'Draft (or null)' },
      401: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Unauthorized' },
    },
  }),
  asHandler(getDraft),
)

postsRoutes.openapi(
  createRoute({
    method: 'post',
    path: '/draft',
    tags: ['Posts'],
    summary: 'Create or update the draft',
    security: [{ bearerAuth: [] }],
    request: {
      body: { content: { 'application/json': { schema: SaveDraftRequestSchema } } },
    },
    responses: {
      200: { content: { 'application/json': { schema: SaveDraftResponseSchema } }, description: 'Draft updated' },
      201: { content: { 'application/json': { schema: SaveDraftResponseSchema } }, description: 'Draft created' },
      400: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Nothing to save' },
      401: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Unauthorized' },
      413: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Image must be 10MB or smaller' },
    },
  }),
  asHandler(saveDraft),
)

postsRoutes.openapi(
  createRoute({
    method: 'delete',
    path: '/draft',
    tags: ['Posts'],
    summary: "Delete the authenticated user's draft",
    security: [{ bearerAuth: [] }],
    responses: {
      200: { content: { 'application/json': { schema: SuccessFlagResponseSchema } }, description: 'Draft deleted' },
      401: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Unauthorized' },
    },
  }),
  asHandler(deleteDraft),
)

postsRoutes.openapi(
  createRoute({
    method: 'post',
    path: '/',
    tags: ['Posts'],
    summary: 'Create (publish) a post',
    security: [{ bearerAuth: [] }],
    request: {
      body: { content: { 'application/json': { schema: CreatePostRequestSchema } } },
    },
    responses: {
      200: { content: { 'application/json': { schema: CreatePostResponseSchema } }, description: 'Draft published' },
      201: { content: { 'application/json': { schema: CreatePostResponseSchema } }, description: 'Post created' },
      400: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Image, caption, and alt text are required' },
      401: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Unauthorized' },
      413: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Image must be 10MB or smaller' },
    },
  }),
  asHandler(createPost),
)

postsRoutes.openapi(
  createRoute({
    method: 'get',
    path: '/{slug}',
    tags: ['Posts'],
    summary: 'Get a single post by slug',
    request: { params: SlugParamSchema },
    responses: {
      200: { content: { 'application/json': { schema: GetPostResponseSchema } }, description: 'Post detail' },
      404: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Post not found' },
    },
  }),
  asHandler(getPostBySlug),
)

postsRoutes.openapi(
  createRoute({
    method: 'delete',
    path: '/{slug}',
    tags: ['Posts'],
    summary: 'Delete a post owned by the authenticated user',
    security: [{ bearerAuth: [] }],
    request: { params: SlugParamSchema },
    responses: {
      200: { content: { 'application/json': { schema: SuccessFlagResponseSchema } }, description: 'Post deleted' },
      401: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Unauthorized' },
      404: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Post not found' },
      500: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Unable to delete post' },
    },
  }),
  asHandler(deletePost),
)

postsRoutes.openapi(
  createRoute({
    method: 'post',
    path: '/{slug}/like',
    tags: ['Posts'],
    summary: 'Toggle a like on a post',
    security: [{ bearerAuth: [] }],
    request: { params: SlugParamSchema },
    responses: {
      200: { content: { 'application/json': { schema: ToggleLikeResponseSchema } }, description: 'Like toggled' },
      401: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Unauthorized' },
      404: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Post not found' },
    },
  }),
  asHandler(toggleLike),
)

postsRoutes.openapi(
  createRoute({
    method: 'post',
    path: '/{slug}/save',
    tags: ['Posts'],
    summary: 'Toggle a save/bookmark on a post',
    security: [{ bearerAuth: [] }],
    request: { params: SlugParamSchema },
    responses: {
      200: { content: { 'application/json': { schema: ToggleSaveResponseSchema } }, description: 'Save toggled' },
      401: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Unauthorized' },
      404: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Post not found' },
    },
  }),
  asHandler(toggleSave),
)

export default postsRoutes
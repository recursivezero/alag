import { OpenAPIHono, createRoute } from '@hono/zod-openapi'
import {
  adminCreateUser,
  adminDashboardData,
  adminDeleteUser,
  adminDisableUser,
  adminEnableUser,
  adminListUsers,
  adminLogin,
  adminMe,
  adminLogout,
} from '../controllers/admin.controller.js'
import { jsonMessageHook } from '../middleware/validationHook.js'
import { asHandler } from '../middleware/asHandler.js'
import { ErrorResponseSchema, IdParamSchema, MessageResponseSchema } from '../schemas/common.schemas.js'
import {
  AdminCreateUserRequestSchema,
  AdminCreateUserResponseSchema,
  AdminDashboardQuerySchema,
  AdminDashboardResponseSchema,
  AdminDeleteUserResponseSchema,
  AdminListUsersQuerySchema,
  AdminListUsersResponseSchema,
  AdminLoginRequestSchema,
  AdminLoginResponseSchema,
  AdminMeResponseSchema,
  AdminUserActionResponseSchema,
} from '../schemas/admin.schemas.js'

const adminRoutes = new OpenAPIHono({ defaultHook: jsonMessageHook })

adminRoutes.openapi(
  createRoute({
    method: 'post',
    path: '/login',
    tags: ['Admin'],
    summary: 'Admin login',
    request: {
      body: { content: { 'application/json': { schema: AdminLoginRequestSchema } } },
    },
    responses: {
      200: { content: { 'application/json': { schema: AdminLoginResponseSchema } }, description: 'Login successful' },
      400: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Email and password are required' },
      401: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Invalid admin credentials' },
      500: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Unable to complete admin login' },
    },
  }),
  asHandler(adminLogin),
)

adminRoutes.openapi(
  createRoute({
    method: 'get',
    path: '/me',
    tags: ['Admin'],
    summary: 'Get the currently authenticated admin',
    security: [{ bearerAuth: [] }],
    responses: {
      200: { content: { 'application/json': { schema: AdminMeResponseSchema } }, description: 'Current admin' },
      401: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Unauthorized' },
    },
  }),
  asHandler(adminMe),
)

adminRoutes.openapi(
  createRoute({
    method: 'post',
    path: '/logout',
    tags: ['Admin'],
    summary: 'Log out the current admin session',
    responses: {
      200: { content: { 'application/json': { schema: MessageResponseSchema } }, description: 'Logged out' },
    },
  }),
  asHandler(adminLogout),
)

adminRoutes.openapi(
  createRoute({
    method: 'get',
    path: '/dashboard',
    tags: ['Admin'],
    summary: 'Get paginated dashboard data (stats, trends, users)',
    security: [{ bearerAuth: [] }],
    request: { query: AdminDashboardQuerySchema },
    responses: {
      200: { content: { 'application/json': { schema: AdminDashboardResponseSchema } }, description: 'Dashboard data' },
      401: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Unauthorized' },
      500: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Unable to load admin dashboard data' },
    },
  }),
  asHandler(adminDashboardData),
)

adminRoutes.openapi(
  createRoute({
    method: 'get',
    path: '/users',
    tags: ['Admin'],
    summary: 'List users (admin view)',
    security: [{ bearerAuth: [] }],
    request: { query: AdminListUsersQuerySchema },
    responses: {
      200: { content: { 'application/json': { schema: AdminListUsersResponseSchema } }, description: 'User list' },
      401: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Unauthorized' },
    },
  }),
  asHandler(adminListUsers),
)

adminRoutes.openapi(
  createRoute({
    method: 'post',
    path: '/users',
    tags: ['Admin'],
    summary: 'Create a user as an admin (direct or OTP-verified)',
    security: [{ bearerAuth: [] }],
    request: {
      body: { content: { 'application/json': { schema: AdminCreateUserRequestSchema } } },
    },
    responses: {
      201: { content: { 'application/json': { schema: AdminCreateUserResponseSchema } }, description: 'User created or OTP sent' },
      400: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Missing fields or weak password' },
      401: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Unauthorized' },
      409: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Email already registered' },
      500: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Failed to send OTP email' },
    },
  }),
  asHandler(adminCreateUser),
)

adminRoutes.openapi(
  createRoute({
    method: 'patch',
    path: '/users/{id}/enable',
    tags: ['Admin'],
    summary: 'Enable a user',
    security: [{ bearerAuth: [] }],
    request: { params: IdParamSchema },
    responses: {
      200: { content: { 'application/json': { schema: AdminUserActionResponseSchema } }, description: 'User enabled' },
      400: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Invalid user id' },
      401: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Unauthorized' },
      404: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'User not found' },
    },
  }),
  asHandler(adminEnableUser),
)

adminRoutes.openapi(
  createRoute({
    method: 'patch',
    path: '/users/{id}/disable',
    tags: ['Admin'],
    summary: 'Disable a user',
    security: [{ bearerAuth: [] }],
    request: { params: IdParamSchema },
    responses: {
      200: { content: { 'application/json': { schema: AdminUserActionResponseSchema } }, description: 'User disabled' },
      400: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Invalid user id' },
      401: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Unauthorized' },
      404: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'User not found' },
    },
  }),
  asHandler(adminDisableUser),
)

adminRoutes.openapi(
  createRoute({
    method: 'delete',
    path: '/users/{id}',
    tags: ['Admin'],
    summary: 'Permanently delete a user',
    security: [{ bearerAuth: [] }],
    request: { params: IdParamSchema },
    responses: {
      200: { content: { 'application/json': { schema: AdminDeleteUserResponseSchema } }, description: 'User deleted' },
      400: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Invalid user id' },
      401: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Unauthorized' },
      404: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'User not found' },
    },
  }),
  asHandler(adminDeleteUser),
)

export default adminRoutes
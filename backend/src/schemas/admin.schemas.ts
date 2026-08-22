import { z } from '@hono/zod-openapi'

export const AdminLoginRequestSchema = z
  .object({
    email: z.string().email().openapi({ example: 'admin@gmail.com' }),
    password: z.string().min(1).openapi({ example: 'AdminP@ss123' }),
  })
  .openapi('AdminLoginRequest')

export const AdminSchema = z
  .object({
    id: z.number().openapi({ example: 0 }),
    full_name: z.string().openapi({ example: 'Admin User' }),
    name: z.string().optional().openapi({ example: 'Admin User' }),
    email: z.string().email().openapi({ example: 'admin@gmail.com' }),
    role: z.string().openapi({ example: 'admin' }),
  })
  .openapi('Admin')

export const AdminLoginResponseSchema = z
  .object({
    role: z.literal('admin'),
    redirectTo: z.string().openapi({ example: '/admin/dashboard' }),
    admin: AdminSchema,
  })
  .openapi('AdminLoginResponse')

export const AdminMeResponseSchema = z
  .object({
    admin: AdminSchema,
  })
  .openapi('AdminMeResponse')

export const AdminDashboardUserSchema = z
  .object({
    id: z.number().openapi({ example: 1 }),
    fullName: z.string().openapi({ example: 'Jane Doe' }),
    email: z.string().email().openapi({ example: 'jane@example.com' }),
    role: z.string().openapi({ example: 'user' }),
    isDisabled: z.union([z.boolean(), z.number()]).openapi({ example: false }),
    createdAt: z.union([z.string(), z.date()]).openapi({ example: '2026-06-01T10:00:00.000Z' }),
  })
  .openapi('AdminDashboardUser')

export const AdminDashboardQuerySchema = z.object({
  search: z.string().optional().openapi({ param: { name: 'search', in: 'query' } }),
  role: z.string().optional().openapi({ param: { name: 'role', in: 'query' }, example: 'all' }),
  status: z.string().optional().openapi({ param: { name: 'status', in: 'query' }, example: 'all' }),
  page: z.string().optional().openapi({ param: { name: 'page', in: 'query' }, example: '1' }),
  pageSize: z.string().optional().openapi({ param: { name: 'pageSize', in: 'query' }, example: '5' }),
})

export const AdminDashboardResponseSchema = z
  .object({
    admin: AdminSchema,
    stats: z.object({
      totalUsers: z.number(),
      activeUsers: z.number(),
      disabledUsers: z.number(),
      deletedUsers: z.number(),
    }),
    trends: z.object({
      totalUsers: z.number(),
      activeUsers: z.number(),
      disabledUsers: z.number(),
      deletedUsers: z.number(),
    }),
    users: z.array(AdminDashboardUserSchema),
    pagination: z.object({
      page: z.number(),
      pageSize: z.number(),
      total: z.number(),
      totalPages: z.number(),
    }),
  })
  .openapi('AdminDashboardResponse')

export const AdminListUsersQuerySchema = z.object({
  search: z.string().optional().openapi({ param: { name: 'search', in: 'query' } }),
  status: z.string().optional().openapi({ param: { name: 'status', in: 'query' }, example: 'all' }),
})

export const AdminListUsersResponseSchema = z
  .object({
    users: z.array(
      z.object({
        id: z.number(),
        fullName: z.string(),
        email: z.string().email(),
        createdAt: z.union([z.string(), z.date()]),
        isDisabled: z.union([z.boolean(), z.number()]),
      }),
    ),
    totalUsers: z.number().openapi({ example: 10 }),
    deletedUsers: z.number().openapi({ example: 2 }),
  })
  .openapi('AdminListUsersResponse')

export const AdminCreateUserRequestSchema = z
  .object({
    fullName: z.string().min(1).openapi({ example: 'Jane Doe' }),
    email: z.string().email().openapi({ example: 'jane@example.com' }),
    password: z.string().min(8).openapi({ example: 'P@ssw0rd123' }),
    verificationMethod: z.enum(['otp', 'direct']).optional().openapi({ example: 'direct' }),
  })
  .openapi('AdminCreateUserRequest')

export const AdminCreateUserResponseSchema = z
  .object({
    message: z.string().openapi({ example: 'User created successfully' }),
    verificationMethod: z.enum(['otp', 'direct']).optional(),
    user: z
      .object({
        id: z.number(),
        fullName: z.string(),
        email: z.string().email(),
        createdAt: z.union([z.string(), z.date()]),
        isDisabled: z.union([z.boolean(), z.number()]),
      })
      .nullable()
      .optional(),
  })
  .openapi('AdminCreateUserResponse')

export const AdminUserActionResponseSchema = z
  .object({
    message: z.string().openapi({ example: 'User enabled' }),
    id: z.number().openapi({ example: 1 }),
  })
  .openapi('AdminUserActionResponse')

export const AdminDeleteUserResponseSchema = z
  .object({
    message: z.string().openapi({ example: 'User deleted permanently' }),
    id: z.number().openapi({ example: 1 }),
    deletedUsers: z.number().openapi({ example: 3 }),
  })
  .openapi('AdminDeleteUserResponse')
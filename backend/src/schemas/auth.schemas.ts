import { z } from '@hono/zod-openapi'



const emailField = z.string().email().openapi({ example: 'jane@example.com' })
const passwordField = z
  .string()
  .min(1)
  .openapi({ example: 'P@ssw0rd123', description: 'Plaintext password (hashed server-side)' })



export const RegisterRequestSchema = z
  .object({
    name: z.string().min(1).openapi({ example: 'Jane Doe' }),
    email: emailField,
    password: passwordField,
  })
  .openapi('RegisterRequest')

export const RegisterResponseSchema = z
  .object({
    message: z.string().openapi({ example: 'OTP sent to your email' }),
  })
  .openapi('RegisterResponse')



export const CheckEmailQuerySchema = z.object({
  email: z.string().openapi({
    param: { name: 'email', in: 'query' },
    example: 'jane@example.com',
  }),
})

export const CheckEmailResponseSchema = z
  .object({
    exists: z.boolean().openapi({ example: false }),
  })
  .openapi('CheckEmailResponse')



export const SendOtpRequestSchema = z
  .object({
    email: emailField,
  })
  .openapi('SendOtpRequest')

export const VerifyOtpRequestSchema = z
  .object({
    email: emailField,
    otp: z.string().length(6).openapi({ example: '123456' }),
  })
  .openapi('VerifyOtpRequest')

export const VerifyOtpResponseSchema = z
  .object({
    message: z.string().openapi({ example: 'Verified' }),
    token: z.string().optional().openapi({ example: 'eyJhbGciOiJIUzI1NiIs...' }),
  })
  .openapi('VerifyOtpResponse')


export const LoginRequestSchema = z
  .object({
    email: emailField,
    password: passwordField,
    remember: z
      .union([z.boolean(), z.literal('true'), z.literal('false')])
      .optional()
      .openapi({ example: false, description: 'Extends the session cookie lifetime when true' }),
  })
  .openapi('LoginRequest')

export const LoginResponseSchema = z
  .object({
    token: z.string().openapi({ example: 'eyJhbGciOiJIUzI1NiIs...' }),
    user: z
      .object({
        id: z.number().openapi({ example: 1 }),
        name: z.string().openapi({ example: 'Jane Doe' }),
        email: z.string().email().openapi({ example: 'jane@example.com' }),
        role: z.string().openapi({ example: 'user' }),
      })
      .openapi('LoginUser'),
  })
  .openapi('LoginResponse')



export const GoogleLoginRequestSchema = z
  .object({
    credential: z.string().openapi({ description: 'Google ID token (JWT) from Google Identity Services' }),
    remember: z
      .union([z.boolean(), z.literal('true'), z.literal('false')])
      .optional()
      .openapi({ example: false }),
  })
  .openapi('GoogleLoginRequest')



export const UserProfileSchema = z
  .object({
    id: z.number().openapi({ example: 1 }),
    name: z.string().openapi({ example: 'Jane Doe' }),
    fullName: z.string().nullable().openapi({ example: 'Jane Doe' }),
    username: z.string().nullable().openapi({ example: 'janedoe' }),
    email: z.string().email().openapi({ example: 'jane@example.com' }),
    phoneNumber: z.string().nullable().openapi({ example: null }),
    bio: z.string().nullable().openapi({ example: null }),
    picture: z.string().nullable().openapi({ example: null }),
    role: z.string().optional().openapi({ example: 'user' }),
    isDisabled: z.boolean().optional().openapi({ example: false }),
  })
  .openapi('UserProfile')

export const GetUserResponseSchema = z
  .object({
    user: UserProfileSchema,
  })
  .openapi('GetUserResponse')

export const UpdateUserProfileRequestSchema = z
  .object({
    name: z.string().min(1).optional(),
    fullName: z.string().min(1).optional(),
    username: z.string().min(1).optional(),
    phoneNumber: z.string().optional(),
    bio: z.string().optional(),
    picture: z.string().optional(),
  })
  .openapi('UpdateUserProfileRequest')



export const SessionSchema = z
  .object({
    id: z.number().openapi({ example: 1 }),
    deviceName: z.string().openapi({ example: 'MacBook' }),
    browserName: z.string().openapi({ example: 'Chrome' }),
    location: z.string().openapi({ example: 'Hyderabad, Telangana, IN' }),
    loginAtIst: z.string().openapi({ example: '21 Jun 2026, 14:32:10 IST' }),
    status: z.string().openapi({ example: 'Active Now' }),
  })
  .openapi('Session')

export const ListSessionsResponseSchema = z
  .object({
    sessions: z.array(SessionSchema),
  })
  .openapi('ListSessionsResponse')


export const AuthUserListItemSchema = z
  .object({
    id: z.number().openapi({ example: 1 }),
    name: z.string().openapi({ example: 'Jane Doe' }),
    fullName: z.string().openapi({ example: 'Jane Doe' }),
    email: z.string().email().openapi({ example: 'jane@example.com' }),
    role: z.string().openapi({ example: 'user' }),
    createdAt: z.string().openapi({ example: '2026-06-01T10:00:00.000Z' }),
    isVerified: z.boolean().openapi({ example: true }),
    isDisabled: z.boolean().openapi({ example: false }),
  })
  .openapi('AuthUserListItem')

export const ListUsersResponseSchema = z
  .object({
    users: z.array(AuthUserListItemSchema),
  })
  .openapi('ListUsersResponse')

export const CreateUserRequestSchema = z
  .object({
    name: z.string().min(1).openapi({ example: 'Jane Doe' }),
    email: emailField,
    password: passwordField,
  })
  .openapi('CreateUserRequest')

export const EnableDisableUserResponseSchema = z
  .object({
    message: z.string().openapi({ example: 'User enabled' }),
    id: z.number().openapi({ example: 1 }),
  })
  .openapi('EnableDisableUserResponse')


export const ForgotPasswordRequestSchema = z
  .object({
    email: emailField,
  })
  .openapi('ForgotPasswordRequest')

export const ResetPasswordRequestSchema = z
  .object({
    token: z.string().min(1).openapi({ example: 'a1b2c3d4...' }),
    newPassword: z.string().min(8).openapi({ example: 'NewP@ssw0rd123' }),
  })
  .openapi('ResetPasswordRequest')

export const UpdatePasswordRequestSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z
      .string()
      .min(8)
      .openapi({ description: 'Must contain uppercase, lowercase, and a number' }),
  })
  .openapi('UpdatePasswordRequest')
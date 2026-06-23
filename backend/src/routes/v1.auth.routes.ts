import { OpenAPIHono, createRoute } from '@hono/zod-openapi'
import {
  register,
  checkEmail,
  sendOtp,
  verifyOtp,
  login,
  googleLogin,
  getUser,
  updateUserProfile,
  createUser,
  listUsers,
  forgotPassword,
  resetPassword,
  updatePassword,
  enableUser,
  disableUser,
  logout,
  listUserSessions,
} from '../controllers/auth.controller.js'
import { authRateLimiter } from '../middleware/rateLimiter.js'
import { asHandler } from '../middleware/asHandler.js'
import { jsonMessageHook } from '../middleware/validationHook.js'
import { ErrorResponseSchema, IdParamSchema, MessageResponseSchema } from '../schemas/common.schemas.js'
import {
  CheckEmailQuerySchema,
  CheckEmailResponseSchema,
  CreateUserRequestSchema,
  EnableDisableUserResponseSchema,
  ForgotPasswordRequestSchema,
  GetUserResponseSchema,
  GoogleLoginRequestSchema,
  ListSessionsResponseSchema,
  ListUsersResponseSchema,
  LoginRequestSchema,
  LoginResponseSchema,
  RegisterRequestSchema,
  RegisterResponseSchema,
  ResetPasswordRequestSchema,
  SendOtpRequestSchema,
  UpdatePasswordRequestSchema,
  UpdateUserProfileRequestSchema,
  VerifyOtpRequestSchema,
  VerifyOtpResponseSchema,
} from '../schemas/auth.schemas.js'

const authV1 = new OpenAPIHono({ defaultHook: jsonMessageHook })



authV1.openapi(
  createRoute({
    method: 'post',
    path: '/register',
    tags: ['Auth'],
    summary: 'Register a new account',
    description:
      'Starts email/password registration. Stores a pending registration and emails a 7-minute OTP; ' +
      'the account is only created in `/verify-otp` once the OTP is confirmed. Rate limited to 100 requests/minute/IP.',
    middleware: [authRateLimiter] as const,
    request: {
      body: { content: { 'application/json': { schema: RegisterRequestSchema } } },
    },
    responses: {
      200: { content: { 'application/json': { schema: RegisterResponseSchema } }, description: 'OTP sent to email' },
      400: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Missing required fields' },
      409: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Email already registered' },
      429: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Too many requests' },
      500: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Failed to send OTP email' },
    },
  }),
  asHandler(register),
)



authV1.openapi(
  createRoute({
    method: 'get',
    path: '/check-email',
    tags: ['Auth'],
    summary: 'Check whether an email is already registered or pending verification',
    request: { query: CheckEmailQuerySchema },
    responses: {
      200: { content: { 'application/json': { schema: CheckEmailResponseSchema } }, description: 'Lookup result' },
      400: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Email is required' },
    },
  }),
  asHandler(checkEmail),
)


authV1.openapi(
  createRoute({
    method: 'post',
    path: '/send-otp',
    tags: ['Auth'],
    summary: 'Resend a verification OTP',
    description: 'Sends a fresh 7-minute OTP for an email with either a verified account or a pending registration.',
    request: {
      body: { content: { 'application/json': { schema: SendOtpRequestSchema } } },
    },
    responses: {
      200: { content: { 'application/json': { schema: MessageResponseSchema } }, description: 'OTP sent' },
      400: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Email is required' },
      404: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'No registration found for this email' },
      500: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Failed to send OTP email' },
    },
  }),
  asHandler(sendOtp),
)

authV1.openapi(
  createRoute({
    method: 'post',
    path: '/verify-otp',
    tags: ['Auth'],
    summary: 'Verify a registration OTP and create the account',
    description: 'On success, finalizes the pending registration into a verified user and issues a session.',
    request: {
      body: { content: { 'application/json': { schema: VerifyOtpRequestSchema } } },
    },
    responses: {
      200: { content: { 'application/json': { schema: VerifyOtpResponseSchema } }, description: 'Account verified' },
      400: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Invalid or expired OTP' },
      404: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Registration details not found' },
      409: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Email already registered' },
    },
  }),
  asHandler(verifyOtp),
)


authV1.openapi(
  createRoute({
    method: 'post',
    path: '/login',
    tags: ['Auth'],
    summary: 'Log in with email and password',
    description: 'Issues a session cookie and returns a bearer token. Rate limited to 100 requests/minute/IP.',
    middleware: [authRateLimiter] as const,
    request: {
      body: { content: { 'application/json': { schema: LoginRequestSchema } } },
    },
    responses: {
      200: { content: { 'application/json': { schema: LoginResponseSchema } }, description: 'Login successful' },
      400: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Email and password are required' },
      401: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Incorrect password' },
      403: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Account disabled, unverified, or Google-only' },
      404: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'User not found' },
      429: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Too many requests' },
    },
  }),
  asHandler(login),
)

authV1.openapi(
  createRoute({
    method: 'post',
    path: '/google-login',
    tags: ['Auth'],
    summary: 'Log in or register via Google Identity Services',
    request: {
      body: { content: { 'application/json': { schema: GoogleLoginRequestSchema } } },
    },
    responses: {
      200: { content: { 'application/json': { schema: LoginResponseSchema.partial() } }, description: 'Login successful' },
      400: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Google credential is required' },
      401: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Invalid Google account' },
      403: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Account disabled' },
      500: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Google login is not configured' },
    },
  }),
  asHandler(googleLogin),
)

authV1.openapi(
  createRoute({
    method: 'post',
    path: '/logout',
    tags: ['Auth'],
    summary: 'Log out the current session',
    responses: {
      200: { content: { 'application/json': { schema: MessageResponseSchema } }, description: 'Logged out' },
    },
  }),
  asHandler(logout),
)



authV1.openapi(
  createRoute({
    method: 'get',
    path: '/user',
    tags: ['Auth'],
    summary: 'Get the currently authenticated user',
    security: [{ bearerAuth: [] }],
    responses: {
      200: { content: { 'application/json': { schema: GetUserResponseSchema } }, description: 'Current user' },
      401: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'No token provided / invalid token / session expired' },
      403: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Account access disabled' },
    },
  }),
  asHandler(getUser),
)

authV1.openapi(
  createRoute({
    method: 'patch',
    path: '/user',
    tags: ['Auth'],
    summary: "Update the authenticated user's profile",
    security: [{ bearerAuth: [] }],
    request: {
      body: { content: { 'application/json': { schema: UpdateUserProfileRequestSchema } } },
    },
    responses: {
      200: { content: { 'application/json': { schema: GetUserResponseSchema } }, description: 'Updated user' },
      400: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Invalid input' },
      401: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Unauthorized' },
    },
  }),
  asHandler(updateUserProfile),
)


authV1.openapi(
  createRoute({
    method: 'get',
    path: '/sessions',
    tags: ['Auth'],
    summary: "List the authenticated user's active sessions",
    security: [{ bearerAuth: [] }],
    responses: {
      200: { content: { 'application/json': { schema: ListSessionsResponseSchema } }, description: 'Active sessions' },
      401: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Unauthorized' },
    },
  }),
  asHandler(listUserSessions),
)



authV1.openapi(
  createRoute({
    method: 'get',
    path: '/users',
    tags: ['Auth'],
    summary: 'List all users',
    security: [{ bearerAuth: [] }],
    responses: {
      200: { content: { 'application/json': { schema: ListUsersResponseSchema } }, description: 'User list' },
      401: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Unauthorized' },
    },
  }),
  asHandler(listUsers),
)

authV1.openapi(
  createRoute({
    method: 'post',
    path: '/users',
    tags: ['Auth'],
    summary: 'Create a user and send a verification OTP',
    security: [{ bearerAuth: [] }],
    request: {
      body: { content: { 'application/json': { schema: CreateUserRequestSchema } } },
    },
    responses: {
      200: { content: { 'application/json': { schema: MessageResponseSchema } }, description: 'OTP sent for verification' },
      400: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'All fields are required' },
      401: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Unauthorized' },
      409: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Email already registered' },
      500: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Failed to send OTP email' },
    },
  }),
  asHandler(createUser),
)

authV1.openapi(
  createRoute({
    method: 'patch',
    path: '/users/{id}/enable',
    tags: ['Auth'],
    summary: 'Re-enable a disabled user',
    security: [{ bearerAuth: [] }],
    request: { params: IdParamSchema },
    responses: {
      200: { content: { 'application/json': { schema: EnableDisableUserResponseSchema } }, description: 'User enabled' },
      400: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Invalid user id' },
      401: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Unauthorized' },
      404: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'User not found' },
    },
  }),
  asHandler(enableUser),
)

authV1.openapi(
  createRoute({
    method: 'patch',
    path: '/users/{id}/disable',
    tags: ['Auth'],
    summary: 'Disable a user and revoke their sessions',
    security: [{ bearerAuth: [] }],
    request: { params: IdParamSchema },
    responses: {
      200: { content: { 'application/json': { schema: EnableDisableUserResponseSchema } }, description: 'User disabled' },
      400: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Invalid user id' },
      401: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Unauthorized' },
      404: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'User not found' },
    },
  }),
  asHandler(disableUser),
)


authV1.openapi(
  createRoute({
    method: 'post',
    path: '/forgot-password',
    tags: ['Auth'],
    summary: 'Request a password reset link',
    description: 'Always responds with a generic message to avoid leaking whether an email is registered.',
    request: {
      body: { content: { 'application/json': { schema: ForgotPasswordRequestSchema } } },
    },
    responses: {
      200: { content: { 'application/json': { schema: MessageResponseSchema } }, description: 'Reset link sent (if account exists)' },
      400: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Email is required' },
      500: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Failed to send reset link' },
    },
  }),
  asHandler(forgotPassword),
)

authV1.openapi(
  createRoute({
    method: 'post',
    path: '/reset-password',
    tags: ['Auth'],
    summary: 'Reset a password using a reset token',
    request: {
      body: { content: { 'application/json': { schema: ResetPasswordRequestSchema } } },
    },
    responses: {
      200: { content: { 'application/json': { schema: MessageResponseSchema } }, description: 'Password updated successfully' },
      400: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Missing fields, weak password, or invalid/expired link' },
    },
  }),
  asHandler(resetPassword),
)

authV1.openapi(
  createRoute({
    method: 'patch',
    path: '/password',
    tags: ['Auth'],
    summary: "Update the authenticated user's password",
    security: [{ bearerAuth: [] }],
    request: {
      body: { content: { 'application/json': { schema: UpdatePasswordRequestSchema } } },
    },
    responses: {
      200: { content: { 'application/json': { schema: MessageResponseSchema } }, description: 'Password updated successfully' },
      400: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Missing fields or weak password' },
      401: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Unauthorized or incorrect current password' },
      404: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'User not found' },
    },
  }),
  asHandler(updatePassword),
)

export default authV1
import { Hono } from 'hono'
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

const authV1 = new Hono()

authV1.post('/register', authRateLimiter, register)
authV1.get('/check-email', checkEmail)
authV1.post('/send-otp', sendOtp)
authV1.post('/verify-otp', verifyOtp)
authV1.post('/login', authRateLimiter, login)
authV1.post('/google-login', googleLogin)
authV1.post('/logout', logout)
authV1.get('/user', getUser)
authV1.get('/sessions', listUserSessions)
authV1.get('/users', listUsers)
authV1.post('/users', createUser)
authV1.patch('/users/:id/enable', enableUser)
authV1.patch('/users/:id/disable', disableUser)
authV1.post('/forgot-password', forgotPassword)
authV1.post('/reset-password', resetPassword)
authV1.patch('/password', updatePassword)
authV1.patch('/user', updateUserProfile)

export default authV1
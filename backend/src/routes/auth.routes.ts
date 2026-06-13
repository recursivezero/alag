import { Hono } from 'hono'
import { register, checkEmail, sendOtp, verifyOtp, login, googleLogin, getUser, updateUserProfile, createUser, listUsers, forgotPassword, resetPassword, updatePassword, enableUser, disableUser, logout, listUserSessions } from '../controllers/auth.controller'

const auth = new Hono()

auth.post('/register', register)
auth.get('/check-email', checkEmail)
auth.post('/send-otp', sendOtp)
auth.post('/verify-otp', verifyOtp)
auth.post('/login', login)
auth.post('/google-login', googleLogin)
auth.post('/logout', logout)
auth.get('/user', getUser)
auth.get('/sessions', listUserSessions)
auth.get('/users', listUsers)
auth.post('/users', createUser)
auth.patch('/users/:id/enable', enableUser)
auth.patch('/users/:id/disable', disableUser)
auth.post('/forgot-password', forgotPassword)
auth.post('/reset-password', resetPassword)
auth.patch('/password', updatePassword)
auth.patch('/user', updateUserProfile)

export default auth

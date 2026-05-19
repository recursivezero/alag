import { Hono } from 'hono'
import { register, sendOtp, verifyOtp, login, googleLogin, getUser, createUser, listUsers, forgotPassword, resetPassword } from '../controllers/auth.controller'

const auth = new Hono()

auth.post('/register', register)
auth.post('/send-otp', sendOtp)
auth.post('/verify-otp', verifyOtp)
auth.post('/login', login)
auth.post('/google-login', googleLogin)
auth.get('/user', getUser)
auth.get('/users', listUsers)
auth.post('/users', createUser)
auth.post('/forgot-password', forgotPassword)
auth.post('/reset-password', resetPassword)

export default auth

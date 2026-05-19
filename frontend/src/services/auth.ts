import api from './api'

export const registerUser = (data: { name: string; email: string; password: string }) =>
  api.post('/register', data)

export const sendOtp = (data: { email: string }) =>
  api.post('/send-otp', data)

export const verifyOTP = (data: { email: string; otp: string }) =>
  api.post('/verify-otp', data)

export const loginUser = (data: { email: string; password: string }) =>
  api.post('/login', data)

export const googleLogin = (data: { credential: string }) =>
  api.post('/google-login', data)

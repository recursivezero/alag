import nodemailer from 'nodemailer'
import type { Options as SMTPOptions } from 'nodemailer/lib/smtp-transport'

const emailUser = process.env.EMAIL_USER || ''
const emailPassword = process.env.EMAIL_PASSWORD || ''
const emailHost = process.env.EMAIL_HOST || 'smtp.gmail.com'
const emailPort = Number(process.env.EMAIL_PORT || 465)
const emailSecure = String(process.env.EMAIL_SECURE || 'true').toLowerCase() === 'true'

const createTransporter = () =>
  nodemailer.createTransport({
    host: emailHost,
    port: emailPort,
    secure: emailSecure,
    family: 4,
    auth: {
      user: emailUser,
      pass: emailPassword,
    },
    socketTimeout: 30000,
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    tls: {
      minVersion: 'TLSv1.2',
    },
  } as SMTPOptions)

export async function sendOTPEmail(email: string, otp: string) {
  try {
    if (!emailUser || !emailPassword) {
      throw new Error('Email credentials are not configured')
    }

    const transporter = createTransporter()

    const mailOptions = {
      from: `recursivezero <${emailUser}>`,
      to: email,
      subject: 'Your OTP Verification Code - recursivezero',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h1 style="color: #7c5cfc; font-size: 24px; margin-bottom: 20px; text-align: center;">recursivezero</h1>
            <h2 style="color: #333; margin-bottom: 20px;">Email Verification</h2>
            <p style="color: #666; margin-bottom: 20px;">Your OTP verification code is:</p>
            <div style="background-color: #f0f0f0; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0;">
              <h1 style="color: #7c5cfc; letter-spacing: 5px; margin: 0;">${otp}</h1>
            </div>
            <p style="color: #666; margin-bottom: 10px;">This code will expire in 7 minutes.</p>
            <p style="color: #999; font-size: 12px; margin-top: 30px;">If you didn't request this, please ignore this email.</p>
          </div>
        </div>
      `
    }

    await transporter.sendMail(mailOptions)
    console.log(`[EMAIL] OTP sent to ${email}`)
    return true
  } catch (error) {
    console.error('[EMAIL] Error sending OTP:', error)
    return false
  }
}

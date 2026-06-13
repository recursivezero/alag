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
    return true
  } catch (error) {
    console.error('[EMAIL] Error sending OTP:', error)
    return false
  }
}

export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  try {
    if (!emailUser || !emailPassword) {
      throw new Error('Email credentials are not configured')
    }

    const transporter = createTransporter()

    const mailOptions = {
      from: `RecursiveAuth <${emailUser}>`,
      to: email,
      subject: 'Reset your password on RecursiveAuth',
      html: `
        <div style="margin:0;padding:24px 12px;background:#06101f;">
          <div style="max-width:560px;margin:0 auto;padding:0 12px;font-family:Arial,Helvetica,sans-serif;color:#e6ebff;">
            <div style="padding:18px 0;text-align:center;font-size:20px;font-weight:700;letter-spacing:.02em;color:#ffffff;">
              Recursive<span style="color:#8b6bff;">Auth</span>
            </div>
            <div style="background:linear-gradient(180deg,rgba(15,23,42,.95),rgba(9,16,30,.98));border:1px solid rgba(255,255,255,.08);border-radius:22px;box-shadow:0 24px 80px rgba(0,0,0,.4);padding:40px 28px;text-align:center;">
              <div style="width:68px;height:68px;margin:0 auto 20px;border-radius:20px;background:rgba(124,92,252,.16);display:flex;align-items:center;justify-content:center;color:#a78bfa;font-size:30px;line-height:1;">🔒</div>
              <div style="font-size:28px;line-height:1.15;font-weight:800;color:#ffffff;margin-bottom:10px;">We got your request</div>
              <div style="font-size:16px;line-height:1.7;color:#a8b3d1;margin:0 auto 28px;max-width:360px;">You can now reset your password.</div>
              <a href="${resetUrl}" style="display:inline-block;padding:15px 28px;border-radius:14px;background:linear-gradient(90deg,#7c5cfc,#8f5cff);color:#ffffff;text-decoration:none;font-weight:700;box-shadow:0 14px 30px rgba(124,92,252,.28);">Reset Password</a>
              <div style="margin-top:18px;font-size:13px;color:#a8b3d1;">This link will expire in 15 minutes.</div>
              <div style="margin-top:28px;padding-top:22px;border-top:1px solid rgba(255,255,255,.08);font-size:13px;line-height:1.6;color:#8090b8;">
                If you didn’t request a password reset, you can ignore this email.
              </div>
            </div>
          </div>
        </div>
      `,
    }

    await transporter.sendMail(mailOptions)
    return true
  } catch (error) {
    console.error('[EMAIL] Error sending password reset email:', error)
    return false
  }
}

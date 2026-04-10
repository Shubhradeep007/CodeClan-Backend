const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: false, // true for port 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER || 'shubhradeepbose79@gmail.com',
        pass: process.env.EMAIL_PASS || 'jnmp gxub vgcd tzqv',
    },
})

exports.sendWelcomeEmail = async (to, username) => {
    try {
        const mailOptions = {
            from: `"CodeClan Support" <${process.env.EMAIL_USER || 'shubhradeepbose79@gmail.com'}>`,
            to: to,
            subject: 'Welcome to CodeClan!',
            html: `
                <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #060e20; border: 1px solid rgba(219,144,255,0.3); border-radius: 16px; overflow: hidden;">
                    <div style="background: linear-gradient(135deg, #0f192f 0%, #141f37 100%); padding: 40px 40px 32px; text-align: center; border-bottom: 1px solid rgba(219,144,255,0.15);">
                        <div style="font-size: 48px; margin-bottom: 16px;">⚡</div>
                        <h1 style="margin: 0; font-size: 28px; font-weight: 800; color: #dde5ff; letter-spacing: -0.04em;">Welcome, ${username}!</h1>
                        <p style="margin: 8px 0 0; color: #a3abc3; font-size: 15px;">You've joined the CodeClan.</p>
                    </div>
                    <div style="padding: 32px 40px; text-align: center;">
                        <p style="font-size: 15px; color: #a3abc3; line-height: 1.7;">Start exploring public snippets or publish your own right away. The community is waiting.</p>
                    </div>
                    <div style="padding: 0 40px 32px; text-align: center; font-size: 12px; color: #6d758b;">
                        System Transmissions from CodeClan Core.
                    </div>
                </div>
            `
        }
        await transporter.sendMail(mailOptions)
        console.log(`Welcome email sent to ${to}`)
    } catch (error) {
        console.error('Error sending welcome email:', error)
    }
}

exports.sendVerificationEmail = async (to, username, token) => {
    try {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
        const verifyLink = `${frontendUrl}/verify-email?token=${token}`

        const mailOptions = {
            from: `"CodeClan Support" <${process.env.EMAIL_USER || 'shubhradeepbose79@gmail.com'}>`,
            to: to,
            subject: 'CodeClan — Verify Your Email',
            html: `
                <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #060e20; border: 1px solid rgba(219,144,255,0.3); border-radius: 16px; overflow: hidden;">
                    <div style="background: linear-gradient(135deg, #0f192f 0%, #141f37 100%); padding: 40px 40px 32px; text-align: center; border-bottom: 1px solid rgba(219,144,255,0.15);">
                        <div style="font-size: 48px; margin-bottom: 16px;">📬</div>
                        <h1 style="margin: 0; font-size: 28px; font-weight: 800; color: #dde5ff; letter-spacing: -0.04em;">Verify Your Email</h1>
                        <p style="margin: 8px 0 0; color: #a3abc3; font-size: 15px;">One last step, ${username}.</p>
                    </div>
                    <div style="padding: 32px 40px; text-align: center;">
                        <p style="font-size: 15px; color: #a3abc3; line-height: 1.7;">Click the button below to verify your email address and activate your CodeClan account. This link expires in <strong style="color: #db90ff;">24 hours</strong>.</p>
                        <a href="${verifyLink}" style="display: inline-block; margin: 24px 0; padding: 14px 32px; background: linear-gradient(135deg, #db90ff, #a275ff); color: #000; font-weight: 700; font-size: 15px; text-decoration: none; border-radius: 8px; letter-spacing: 0.02em;">
                            ✅ Verify My Account
                        </a>
                        <p style="font-size: 12px; color: #6d758b; word-break: break-all;">Or paste this link in your browser:<br/><span style="color: #00e3fd;">${verifyLink}</span></p>
                    </div>
                    <div style="padding: 0 40px 32px; text-align: center; border-top: 1px solid rgba(64,72,92,0.15); margin: 0 40px; padding-top: 24px;">
                        <p style="font-size: 12px; color: #6d758b; margin: 0;">If you did not create an account, you can safely ignore this email.</p>
                    </div>
                </div>
            `
        }
        await transporter.sendMail(mailOptions)
        console.log(`Verification email sent to ${to}`)
    } catch (error) {
        console.error('Error sending verification email:', error)
    }
}

exports.sendPasswordResetEmail = async (to, token) => {
    try {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
        const resetLink = `${frontendUrl}/reset-password?token=${token}`

        const mailOptions = {
            from: `"CodeClan Support" <${process.env.EMAIL_USER || 'shubhradeepbose79@gmail.com'}>`,
            to: to,
            subject: 'CodeClan - Password Reset Request',
            html: `
                <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #060e20; border: 1px solid rgba(219,144,255,0.3); border-radius: 16px; overflow: hidden;">
                    <div style="background: linear-gradient(135deg, #0f192f 0%, #141f37 100%); padding: 40px 40px 32px; text-align: center; border-bottom: 1px solid rgba(219,144,255,0.15);">
                        <div style="font-size: 48px; margin-bottom: 16px;">🔐</div>
                        <h1 style="margin: 0; font-size: 28px; font-weight: 800; color: #dde5ff; letter-spacing: -0.04em;">Password Reset</h1>
                        <p style="margin: 8px 0 0; color: #a3abc3; font-size: 15px;">We received a reset request for your account.</p>
                    </div>
                    <div style="padding: 32px 40px; text-align: center;">
                        <p style="font-size: 15px; color: #a3abc3; line-height: 1.7;">Click the button below to reset your password. This link is valid for <strong style="color: #db90ff;">1 hour</strong>.</p>
                        <a href="${resetLink}" style="display: inline-block; margin: 24px 0; padding: 14px 32px; background: linear-gradient(135deg, #00e3fd, #00b4d8); color: #000; font-weight: 700; font-size: 15px; text-decoration: none; border-radius: 8px;">
                            🔑 Reset My Password
                        </a>
                        <p style="font-size: 13px; color: #6d758b;">If you did not request this, please safely ignore this email.</p>
                    </div>
                </div>
            `
        }
        await transporter.sendMail(mailOptions)
        console.log(`Password reset email sent to ${to}`)
    } catch (error) {
        console.error('Error sending password reset email:', error)
    }
}

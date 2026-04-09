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
                <div style="font-family: inherit; max-width: 600px; padding: 20px; text-align: center;">
                    <h1 style="color: #00e3fd;">Welcome, ${username}! ⚡</h1>
                    <p style="font-size: 16px; color: #333;">We are thrilled to have you join CodeClan.</p>
                    <p style="font-size: 16px; color: #333;">Start exploring public snippets or publish your own right away!</p>
                    <br />
                    <p style="font-size: 14px; color: #888;">System Transmissions from CodeClan Core.</p>
                </div>
            `
        }

        await transporter.sendMail(mailOptions)
        console.log(`Welcome email sent to ${to}`)
    } catch (error) {
        console.error('Error sending welcome email:', error)
    }
}

exports.sendPasswordResetEmail = async (to, token) => {
    try {
        // Construct reset URL dynamically depending on frontend host
        // Assuming Next.js runs on localhost:3000 by default for dev environments, or process.env.FRONTEND_URL
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
        const resetLink = `${frontendUrl}/reset-password?token=${token}`

        const mailOptions = {
            from: `"CodeClan Support" <${process.env.EMAIL_USER || 'shubhradeepbose79@gmail.com'}>`,
            to: to,
            subject: 'CodeClan - Password Reset Request',
            html: `
                <div style="font-family: inherit; max-width: 600px; padding: 30px; background: #060e20; color: #fff; text-align: center; border-radius: 12px; border: 1px solid #7c3aed;">
                    <h2 style="color: #db90ff;">Password Reset Authorized</h2>
                    <p style="font-size: 16px; color: #ccc;">We received a request to reset your password. This link is valid for 1 hour.</p>
                    <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background: #00e3fd; color: #000; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 24px 0;">Reset Password</a>
                    <p style="font-size: 13px; color: #777;">If you did not request this, please safely ignore this email.</p>
                </div>
            `
        }

        await transporter.sendMail(mailOptions)
        console.log(`Password reset email sent to ${to}`)
    } catch (error) {
        console.error('Error sending password reset email:', error)
    }
}

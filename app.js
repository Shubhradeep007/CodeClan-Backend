require('dotenv').config()
const express = require("express")
const cors = require("cors")
const rateLimit = require("express-rate-limit")

const app = express()

// ─── CORS ─────────────────────────────────────────────────────────────────
// In production, replace '*' with your exact frontend domain(s)
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-access-token'],
    credentials: true
}))

// ─── GLOBAL RATE LIMIT — 100 requests per minute per IP ───────────────────
const globalLimiter = rateLimit({
    windowMs: 60 * 1000,        // 1 minute
    max: 100,                   // limit each IP to 100 requests per window
    standardHeaders: true,      // return rate limit info in `RateLimit-*` headers
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many requests. Please try again in a minute."
    }
})
app.use(globalLimiter)

// ─── VOTE RATE LIMIT — 20 votes per minute per IP ─────────────────────────
const voteLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Vote rate limit exceeded. Please try again in a minute."
    }
})

// ─── BODY PARSER ──────────────────────────────────────────────────────────
app.use(express.json())

// ─── DATABASE ─────────────────────────────────────────────────────────────
const DatabaseConnection = require('./app/config/dbconfig')
DatabaseConnection()

// ─── ROUTES ───────────────────────────────────────────────────────────────
const authRoutes = require('./app/routes/user.route')
app.use('/api/users', authRoutes)

const snippetRoutes = require('./app/routes/snippets.routes')
app.use('/api/snippets', snippetRoutes)

// Apply vote rate limiter specifically to the vote endpoint
app.use('/api/snippets/:id/vote', voteLimiter)

const groupRouter = require('./app/routes/group.routes')
app.use('/api/group', groupRouter)

const followRouter = require('./app/routes/follow.route')
app.use('/api/follow', followRouter)

const adminRouter = require('./app/routes/admin.routes')
app.use('/api/admin', adminRouter)

const commentRouter = require('./app/routes/comment.routes')
app.use('/api/comments', commentRouter)

// ─── HEALTH CHECK ─────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
    res.status(200).json({ success: true, message: "CodeClan API is running", version: "1.0.0" })
})

// ─── 404 HANDLER ──────────────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ success: false, message: "Route not found" })
})

// ─── SERVER ───────────────────────────────────────────────────────────────
const port = process.env.PORT || 4000
app.listen(port, (err) => {
    if (err) {
        console.log("Unable to start the server")
    } else {
        console.log(`Server has been started on the port: ${port}`)
    }
})
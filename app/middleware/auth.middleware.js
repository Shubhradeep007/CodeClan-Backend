const jwt = require('jsonwebtoken')
const StatusCode = require('../utils/StatusCode')

// ─── Helper: extract raw token from various header formats ────────────────
function extractToken(req) {
    const authHeader = req.headers['authorization'] || req.headers['x-access-token']
    if (authHeader) {
        // Support both: "Bearer <token>" and raw "<token>"
        if (authHeader.startsWith('Bearer ')) {
            return authHeader.slice(7)
        }
        return authHeader
    }
    // Fallback: token in body or query (legacy support)
    return req.body?.token || req.query?.token || null
}

// ─── STRICT auth: blocks unauthenticated requests ─────────────────────────
const middlewareAuthCheck = async (req, res, next) => {
    const token = extractToken(req)

    if (!token) {
        return res.status(StatusCode.UNAUTHORIZED).json({
            success: false,
            message: "Authentication required. Please provide a valid token."
        })
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY)
        req.user = decoded
    } catch (error) {
        return res.status(StatusCode.UNAUTHORIZED).json({
            success: false,
            message: "Invalid or expired token"
        })
    }

    return next()
}

// ─── OPTIONAL auth: sets req.user if token present, passes through if not ──
const optionalAuth = async (req, res, next) => {
    const token = extractToken(req)

    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY)
            req.user = decoded
        } catch (error) {
            // Invalid token — treat as unauthenticated (don't block)
            req.user = null
        }
    } else {
        req.user = null
    }

    return next()
}

module.exports = middlewareAuthCheck
module.exports.optionalAuth = optionalAuth
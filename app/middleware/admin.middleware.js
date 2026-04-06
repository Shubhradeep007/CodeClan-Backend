const StatusCode = require('../utils/StatusCode')

// ─── Admin guard: must be used AFTER middlewareAuthCheck ──────────────────
// Ensures only users with role === 'admin' can access the route
const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(StatusCode.FORBIDDEN).json({
            success: false,
            message: "Access denied. Admin privileges required."
        })
    }
    return next()
}

module.exports = requireAdmin

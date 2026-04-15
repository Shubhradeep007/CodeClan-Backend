const express = require('express')
const router = express.Router()

const middlewareAuthCheck = require('../middleware/auth.middleware')
const requireAdmin = require('../middleware/admin.middleware')
const adminController = require('../controller/admin.controller')

// All admin routes require: valid JWT + admin role
router.use(middlewareAuthCheck, requireAdmin)

// ─── USER MANAGEMENT ──────────────────────────────────────────────────────
// GET    /api/admin/users           — list all users (paginated, searchable)
// GET    /api/admin/users/:id       — get single user detail
// PATCH  /api/admin/users/:id/suspend  — suspend user account
// PATCH  /api/admin/users/:id/activate — activate user account

router.get('/users', adminController.getAllUsers)
router.get('/users/:id', adminController.getUserById)
router.patch('/users/:id/suspend', adminController.suspendUser)
router.patch('/users/:id/activate', adminController.activateUser)
router.patch('/users/:id/role', adminController.updateUserRole)

// ─── SNIPPET MANAGEMENT ───────────────────────────────────────────────────
// DELETE /api/admin/snippets/:id    — hard delete any snippet

router.delete('/snippets/:id', adminController.hardDeleteSnippet)

module.exports = router

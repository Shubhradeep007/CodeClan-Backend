const express = require('express')
const router = express.Router()

const middlewareAuthCheck = require('../middleware/auth.middleware')
const { optionalAuth } = require('../middleware/auth.middleware')
const commentController = require('../controller/comment.controller')

// ─── COMMENT ROUTES ───────────────────────────────────────────────────────

// POST   /api/comments              — add a comment (auth required)
// GET    /api/comments/:snippetId   — get comments for snippet (optional auth)
// PUT    /api/comments/:id          — edit comment (auth required, owner only)
// DELETE /api/comments/:id          — soft delete (auth required, owner/admin)

router.post('/', middlewareAuthCheck, commentController.addComment)
router.get('/:snippetId', optionalAuth, commentController.getSnippetComments)
router.put('/:id', middlewareAuthCheck, commentController.updateComment)
router.delete('/:id', middlewareAuthCheck, commentController.deleteComment)
router.put('/:id/like', middlewareAuthCheck, commentController.toggleLikeComment)

module.exports = router

const express = require('express')
const router = express.Router()

const SnippetController = require('../controller/snippet.controller')
const VoteController = require('../controller/vote.controller')
const middlewareAuthCheck = require('../middleware/auth.middleware')
const { optionalAuth } = require('../middleware/auth.middleware')

// ─── PUBLIC ROUTES (no token needed) ─────────────────────────────────
// optionalAuth: attaches req.user if a token is sent, but doesn't block if absent
router.get('/feed', optionalAuth, SnippetController.getPublicFeed)
router.get('/search', optionalAuth, SnippetController.searchSnippets)

// ─── PROTECTED ROUTES (token required) ───────────────────────────────
router.get('/me', middlewareAuthCheck, SnippetController.getMySnippets)
router.post('/create', middlewareAuthCheck, SnippetController.createSnippet)

// Single snippet — auth optional (access check inside controller)
// Public snippets accessible without token; private/group snippets need token
router.get('/:id', optionalAuth, SnippetController.getSnippet)

router.put('/update/:id', middlewareAuthCheck, SnippetController.updateSnippet)
router.delete('/delete/:id', middlewareAuthCheck, SnippetController.deleteSnippet)
router.patch('/visibility/:id', middlewareAuthCheck, SnippetController.toggleVisibility)
router.patch('/publish/:id', middlewareAuthCheck, SnippetController.publishSnippet)

// ─── VOTE ROUTES ──────────────────────────────────────────────────────
router.post('/:id/vote', middlewareAuthCheck, VoteController.castVote)
router.get('/:id/vote-status', middlewareAuthCheck, VoteController.getVoteStatus)

module.exports = router
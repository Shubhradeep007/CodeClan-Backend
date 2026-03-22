const express = require('express')
const router = express.Router()

const SnippetController = require('../controller/snippet.controller')
const VoteController = require('../controller/vote.controller')
const middlewareAuthCheck = require('../middleware/auth.middleware')

// ─── PUBLIC ROUTES (no token needed) ─────────────────────────────────
router.get('/feed', SnippetController.getPublicFeed)
router.get('/search', SnippetController.searchSnippets)

// ─── PROTECTED ROUTES (token required) ───────────────────────────────
router.get('/me', middlewareAuthCheck, SnippetController.getMySnippets)
router.post('/create', middlewareAuthCheck, SnippetController.createSnippet)

// Single snippet — auth optional (access check inside controller)
router.get('/:id', middlewareAuthCheck, SnippetController.getSnippet)

router.put('/update/:id', middlewareAuthCheck, SnippetController.updateSnippet)
router.delete('/delete/:id', middlewareAuthCheck, SnippetController.deleteSnippet)
router.patch('/visibility/:id', middlewareAuthCheck, SnippetController.toggleVisibility)
router.patch('/publish/:id', middlewareAuthCheck, SnippetController.publishSnippet)

// ─── VOTE ROUTES ──────────────────────────────────────────────────────
router.post('/:id/vote', middlewareAuthCheck, VoteController.castVote)
router.get('/:id/vote-status', middlewareAuthCheck, VoteController.getVoteStatus)

module.exports = router
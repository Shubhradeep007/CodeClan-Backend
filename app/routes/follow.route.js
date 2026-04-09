const express = require('express')
const FollowController = require('../controller/follow.controller')
const middlewareAuthCheck = require('../middleware/auth.middleware')

const router = express.Router()

router.post("/:userId", middlewareAuthCheck, FollowController.toggleFollow)
router.get("/status/:userId", middlewareAuthCheck, FollowController.checkStatus)
router.get("/followers/:userId", FollowController.getFollowers)
router.get("/following/:userId", FollowController.getFollowing)

module.exports = router

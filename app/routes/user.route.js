const express = require("express")
const userController = require("../controller/auth.controller")
const middlewareAuthCheck = require("../middleware/auth.middleware")
const { optionalAuth } = require("../middleware/auth.middleware")
const { uploadAvatar } = require("../utils/cloud.imageupload")

const router = express.Router()

router.post("/register", uploadAvatar.single('user_profile_image'), userController.registerUser)
router.post("/login", userController.loginUser)
router.post("/forgot-password", userController.forgotPassword)
router.post("/reset-password/:token", userController.resetPassword)
router.get("/verify-email/:token", userController.verifyEmail)
router.post("/refresh-token", userController.refreshToken)
router.post("/logout", userController.logoutUser)

router.get("/me", middlewareAuthCheck, userController.getMe)
router.get("/my-stats", middlewareAuthCheck, userController.getMyStats)
router.put("/update/:id", middlewareAuthCheck, uploadAvatar.single('user_profile_image'), userController.updateUserProfile)
router.delete("/delete/:id", middlewareAuthCheck, userController.deleteUser)

router.get("/search", optionalAuth, userController.searchUsers)
router.get("/profile/:username", optionalAuth, userController.getPublicProfile)

module.exports = router
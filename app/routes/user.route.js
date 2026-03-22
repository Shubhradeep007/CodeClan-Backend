const express = require("express")
const userController = require("../controller/auth.controller")
const middlewareAuthCheck = require("../middleware/auth.middleware")
const { uploadAvatar } = require("../utils/cloud.imageupload")

const router = express.Router()

router.post("/register", uploadAvatar.single('user_profile_image'), userController.registerUser)
router.post("/login", userController.loginUser)

router.get("/me", middlewareAuthCheck, userController.getMe)
router.put("/update/:id", middlewareAuthCheck, uploadAvatar.single('user_profile_image'), userController.updateUserProfile)
router.delete("/delete/:id", middlewareAuthCheck, userController.deleteUser)

module.exports = router
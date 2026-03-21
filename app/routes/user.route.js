const express = require("express")
const userController = require("../controllers/user.controller")
const { middlewareAuthCheck, authorizeRoles } = require("../middleware/middleware")
const { uploadUserCloud } = require("../utils/cloud.imageUpload")
const { loginLimiter } = require("../utils/limiter")
const router = express.Router()



router.post("/register", uploadUserCloud.single('user_profile_image'), userController.registerUser)
router.post("/login", loginLimiter, userController.loginUser)

router.get("/api/me", middlewareAuthCheck, userController.getUserProfile)
router.put("/update/:id", middlewareAuthCheck, uploadUserCloud.single('user_profile_image'), userController.updateUserProfile)
router.delete("/delete/:id", middlewareAuthCheck, userController.deleteUser)



module.exports = router
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const UserModel = require('../models/user.model')
const StatusCode = require('../utils/Status.codes')
const { cloudinary } = require('../utils/cloud.imageUpload')

const SALT = 12

class AuthController {

    async registerUser(req, res) {
        try {
            const requestPayload = {
                user_name: req.body.user_name,
                user_email: req.body.user_email,
                user_password: req.body.user_password,
                user_profile_image: req.file ? req.file.path : undefined,
                user_about: req.body.user_about,
                role: req.body.role || 'user'
            }

            if (!requestPayload.user_name || !requestPayload.user_email || !requestPayload.user_password) {
                if (req.file) {
                    const publicId = req.file.path.split('/').slice(-2).join('/').split('.')[0]
                    await cloudinary.uploader.destroy(publicId)
                }
                return res.status(StatusCode.BAD_REQUEST).json({
                    success: false,
                    message: "user_name, user_email and user_password are required"
                })
            }

            const existUser = await UserModel.findOne({ user_email: requestPayload.user_email })
            if (existUser) {
                if (req.file) {
                    const publicId = req.file.path.split('/').slice(-2).join('/').split('.')[0]
                    await cloudinary.uploader.destroy(publicId)
                }
                return res.status(StatusCode.BAD_REQUEST).json({
                    success: false,
                    message: "User already exists"
                })
            }

            const hashPassword = await bcrypt.hash(requestPayload.user_password, SALT)

            const user = new UserModel({
                user_name: requestPayload.user_name,
                user_email: requestPayload.user_email,
                user_password: hashPassword,
                user_profile_image: requestPayload.user_profile_image,
                user_about: requestPayload.user_about,
                role: requestPayload.role
            })

            await user.save()

            const responseUser = {
                _id: user._id,
                user_name: user.user_name,
                user_email: user.user_email,
                user_profile_image: user.user_profile_image,
                user_about: user.user_about,
                role: user.role,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt
            }

            return res.status(StatusCode.CREATED).json({
                success: true,
                message: "User registered successfully",
                data: responseUser
            })

        } catch (err) {
            console.error(err)
            return res.status(StatusCode.SERVER_ERROR).json({
                success: false,
                message: "Server error"
            })
        }
    }


    async loginUser(req, res) {
        try {
            const { user_email, user_password } = req.body

            if (!user_email || !user_password) {
                return res.status(StatusCode.BAD_REQUEST).json({
                    success: false,
                    message: "All fields are required"
                })
            }

            const user = await UserModel.findOne({ user_email })

            if (!user) {
                return res.status(StatusCode.NOT_FOUND).json({
                    success: false,
                    message: "User not found"
                })
            }

            if (!user.isActive) {
                return res.status(StatusCode.UNAUTHORIZED).json({
                    success: false,
                    message: "Your account has been suspended"
                })
            }

            const isMatch = await bcrypt.compare(user_password, user.user_password)

            if (!isMatch) {
                return res.status(StatusCode.BAD_REQUEST).json({
                    success: false,
                    message: "Password doesn't match!"
                })
            }

            const token = jwt.sign({
                id: user._id,
                user_name: user.user_name,
                user_email: user.user_email,
                user_profile_image: user.user_profile_image,
                user_about: user.user_about,
                role: user.role,
                createdAt: user.createdAt
            }, process.env.JWT_SECRET_KEY, { expiresIn: "1d" })

            return res.status(StatusCode.SUCCESS).json({
                success: true,
                message: "User logged in successfully",
                data: {
                    id: user._id,
                    user_name: user.user_name,
                    user_email: user.user_email,
                    user_profile_image: user.user_profile_image,
                    user_about: user.user_about || "",
                    role: user.role
                },
                token: token
            })

        } catch (error) {
            console.error(error)
            return res.status(StatusCode.SERVER_ERROR).json({
                success: false,
                message: "Login failed"
            })
        }
    }


    async getMe(req, res) {
        try {
            return res.status(StatusCode.SUCCESS).json({
                success: true,
                message: "User details",
                data: req.user
            })
        } catch (error) {
            return res.status(StatusCode.SERVER_ERROR).json({
                success: false,
                message: error.message || "Failed to get user profile"
            })
        }
    }


    async updateUserProfile(req, res) {
        try {
            const id = req.params.id

            if (req.user.id !== id && req.user.role !== 'admin') {
                if (req.file) {
                    const publicId = req.file.path.split('/').slice(-2).join('/').split('.')[0]
                    await cloudinary.uploader.destroy(publicId)
                }
                return res.status(StatusCode.UNAUTHORIZED).json({
                    success: false,
                    message: "You are not authorized to update this profile"
                })
            }

            const data = {}
            if (req.body.user_name) data.user_name = req.body.user_name
            if (req.body.user_email) data.user_email = req.body.user_email
            if (req.body.user_about !== undefined) data.user_about = req.body.user_about
            if (req.body.role && req.user.role === 'admin') data.role = req.body.role

            const currentUser = await UserModel.findById(id)
            if (!currentUser) {
                return res.status(StatusCode.NOT_FOUND).json({
                    success: false,
                    message: "User not found"
                })
            }

            if (req.file) {
                if (currentUser.user_profile_image && currentUser.user_profile_image.startsWith('http')) {
                    const publicId = currentUser.user_profile_image.split('/').slice(-2).join('/').split('.')[0]
                    await cloudinary.uploader.destroy(publicId)
                }
                data.user_profile_image = req.file.path
            }

            if (req.body.user_password) {
                data.user_password = await bcrypt.hash(req.body.user_password, SALT)
            }

            const updatedUser = await UserModel.findByIdAndUpdate(id, data, { new: true })

            const responseUser = {
                _id: updatedUser._id,
                user_name: updatedUser.user_name,
                user_email: updatedUser.user_email,
                user_profile_image: updatedUser.user_profile_image,
                user_about: updatedUser.user_about,
                role: updatedUser.role,
                createdAt: updatedUser.createdAt,
                updatedAt: updatedUser.updatedAt
            }

            return res.status(StatusCode.SUCCESS).json({
                success: true,
                message: "User updated successfully",
                data: responseUser
            })

        } catch (error) {
            console.error(error)
            return res.status(StatusCode.SERVER_ERROR).json({
                success: false,
                message: "Failed to update user profile"
            })
        }
    }


    async deleteUser(req, res) {
        try {
            const id = req.params.id

            if (req.user.id !== id && req.user.role !== 'admin') {
                return res.status(StatusCode.UNAUTHORIZED).json({
                    success: false,
                    message: "You are not authorized to delete this user"
                })
            }

            const deletedUser = await UserModel.findByIdAndDelete(id)

            if (!deletedUser) {
                return res.status(StatusCode.NOT_FOUND).json({
                    success: false,
                    message: "User not found"
                })
            }

            if (deletedUser.user_profile_image && deletedUser.user_profile_image.startsWith('http')) {
                const publicId = deletedUser.user_profile_image.split('/').slice(-2).join('/').split('.')[0]
                await cloudinary.uploader.destroy(publicId)
            }

            const responseUser = {
                _id: deletedUser._id,
                user_name: deletedUser.user_name,
                user_email: deletedUser.user_email,
                user_profile_image: deletedUser.user_profile_image,
                user_about: deletedUser.user_about,
                createdAt: deletedUser.createdAt,
                updatedAt: deletedUser.updatedAt
            }

            return res.status(StatusCode.SUCCESS).json({
                success: true,
                message: "User deleted successfully",
                data: responseUser
            })

        } catch (error) {
            console.error(error)
            return res.status(StatusCode.SERVER_ERROR).json({
                success: false,
                message: "Failed to delete user"
            })
        }
    }

}

module.exports = new AuthController()
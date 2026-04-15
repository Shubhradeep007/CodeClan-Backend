const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const mailer = require('../utils/mailer')

const UserModel = require('../models/user.model')
const SnippetModel = require('../models/snippet.model')
const TokenModel = require('../models/token.model')
const FollowModel = require('../models/follow.model')
const StatusCode = require('../utils/StatusCode')
const { cloudinary } = require('../utils/cloud.imageupload')

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

            // Generate email verification token
            const rawVerifyToken = crypto.randomBytes(32).toString('hex')
            const hashedVerifyToken = crypto.createHash('sha256').update(rawVerifyToken).digest('hex')

            const user = new UserModel({
                user_name: requestPayload.user_name,
                user_email: requestPayload.user_email,
                user_password: hashPassword,
                user_profile_image: requestPayload.user_profile_image,
                user_about: requestPayload.user_about,
                role: requestPayload.role,
                isVerified: false,
                emailVerifyToken: hashedVerifyToken,
                emailVerifyExpire: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
            })

            await user.save()

            // Send verification email (fire-and-forget)
            mailer.sendVerificationEmail(user.user_email, user.user_name, rawVerifyToken)

            return res.status(StatusCode.CREATED).json({
                success: true,
                message: "Account created! Please check your email to verify your account before logging in.",
                data: { user_email: user.user_email }
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

            if (!user.isVerified) {
                return res.status(StatusCode.UNAUTHORIZED).json({
                    success: false,
                    message: "Please verify your email address before logging in."
                })
            }

            const isMatch = await bcrypt.compare(user_password, user.user_password)

            if (!isMatch) {
                return res.status(StatusCode.BAD_REQUEST).json({
                    success: false,
                    message: "Password doesn't match!"
                })
            }

            // Create tokens
            const accessToken = jwt.sign({
                id: user._id,
                user_name: user.user_name,
                role: user.role
            }, process.env.JWT_SECRET_KEY, { expiresIn: "15m" })

            const refreshToken = jwt.sign({
                id: user._id,
            }, process.env.REFRESH_SECRET_KEY || process.env.JWT_SECRET_KEY, { expiresIn: "7d" })

            // Save refresh token to DB (Stateful)
            const expiryDate = new Date()
            expiryDate.setDate(expiryDate.getDate() + 7)
            
            await TokenModel.create({
                userId: user._id,
                refreshToken: refreshToken,
                expiresAt: expiryDate
            })

            // Set refresh token in cookie
            res.cookie('jid', refreshToken, {
                httpOnly: true,
                path: '/api/users/refresh-token',
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
                sameSite: 'lax',
                secure: process.env.NODE_ENV === 'production'
            })

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
                token: accessToken
            })

        } catch (error) {
            console.error(error)
            return res.status(StatusCode.SERVER_ERROR).json({
                success: false,
                message: "Login failed"
            })
        }
    }

    async refreshToken(req, res) {
        try {
            const token = req.cookies.jid
            if (!token) {
                return res.status(StatusCode.UNAUTHORIZED).json({ success: false, message: "No refresh token provided" })
            }

            // Stateful check — verify token exists in DB
            const tokenRecord = await TokenModel.findOne({ refreshToken: token })
            if (!tokenRecord) {
                return res.status(StatusCode.UNAUTHORIZED).json({ success: false, message: "Token revoked or not found" })
            }

            let payload = null
            try {
                payload = jwt.verify(token, process.env.REFRESH_SECRET_KEY || process.env.JWT_SECRET_KEY)
            } catch (err) {
                // If JWT verification fails, remove from DB just in case
                await TokenModel.deleteOne({ refreshToken: token })
                return res.status(StatusCode.UNAUTHORIZED).json({ success: false, message: "Invalid refresh token" })
            }

            const user = await UserModel.findById(payload.id)
            if (!user) {
                return res.status(StatusCode.UNAUTHORIZED).json({ success: false, message: "User no longer exists" })
            }

            const accessToken = jwt.sign({
                id: user._id,
                user_name: user.user_name,
                role: user.role
            }, process.env.JWT_SECRET_KEY, { expiresIn: "15m" })

            return res.status(StatusCode.SUCCESS).json({
                success: true,
                token: accessToken
            })
        } catch (error) {
            console.error(error)
            return res.status(StatusCode.SERVER_ERROR).json({ success: false, message: "Refresh failed" })
        }
    }

    async logoutUser(req, res) {
        try {
            const token = req.cookies.jid
            if (token) {
                await TokenModel.deleteOne({ refreshToken: token })
            }
            res.clearCookie('jid', { path: '/api/users/refresh-token' })
            return res.status(StatusCode.SUCCESS).json({
                success: true,
                message: "Logged out successfully"
            })
        } catch (error) {
            console.error(error)
            return res.status(StatusCode.SERVER_ERROR).json({ success: false, message: "Logout failed" })
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

    async searchUsers(req, res) {
        try {
            const { q } = req.query
            if (!q) {
                return res.status(StatusCode.BAD_REQUEST).json({
                    success: false,
                    message: "Search query q is required"
                })
            }

            const page = parseInt(req.query.page) || 1
            const limit = parseInt(req.query.limit) || 20
            const skip = (page - 1) * limit
            

            const pipeline = [
                {
                    $match: {
                        user_name: { $regex: q, $options: 'i' },
                        ...(req.user.role !== 'admin' && { isActive: { $ne: false } })
                    }
                },
                {
                    $lookup: {
                        from: SnippetModel.collection.name,
                        localField: '_id',
                        foreignField: 'created_by',
                        pipeline: [
                            { $match: { visibility: 'public', is_deleted: false } }
                        ],
                        as: 'public_snippets'
                    }
                },
                {
                    $project: {
                        user_name: 1,
                        user_profile_image: 1,
                        user_about: 1,
                        createdAt: 1,
                        publicSnippetCount: { $size: "$public_snippets" }
                    }
                },
                { $sort: { publicSnippetCount: -1, createdAt: -1 } },
                {
                    $facet: {
                        metadata: [{ $count: "total" }],
                        data: [{ $skip: skip }, { $limit: limit }]
                    }
                }
            ]

            const results = await UserModel.aggregate(pipeline)
            
            const total = results[0].metadata.length > 0 ? results[0].metadata[0].total : 0
            const users = results[0].data

            return res.status(StatusCode.SUCCESS).json({
                success: true,
                message: "Users searched successfully",
                data: {
                    users,
                    total,
                    page,
                    totalPages: Math.ceil(total / limit)
                }
            })

        } catch (error) {
            console.error(error)
            return res.status(StatusCode.SERVER_ERROR).json({
                success: false,
                message: "Failed to search users"
            })
        }
    }


    async getPublicProfile(req, res) {
        try {
            const { username } = req.params

            const pipeline = [
                {
                    $match: {
                        user_name: username,
                        ...(req.user?.role !== 'admin' && { isActive: { $ne: false } })
                    }
                },
                {
                    $lookup: {
                        from: SnippetModel.collection.name,
                        let: { userId: '$_id' },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            { $eq: ['$created_by', '$$userId'] },
                                            ...(req.user?.role !== 'admin' ? [{ $eq: ['$visibility', 'public'] }] : []),
                                            { $ne: ['$is_deleted', true] }
                                        ]
                                    }
                                }
                            },
                            { $sort: { createdAt: -1 } }
                        ],
                        as: 'public_snippets'
                    }
                },
                {
                    $lookup: {
                        from: FollowModel.collection.name,
                        localField: '_id',
                        foreignField: 'following_id',
                        as: 'followers'
                    }
                },
                {
                    $lookup: {
                        from: FollowModel.collection.name,
                        localField: '_id',
                        foreignField: 'follower_id',
                        as: 'following'
                    }
                },
                {
                    $project: {
                        user_name: 1,
                        user_profile_image: 1,
                        user_about: 1,
                        createdAt: 1,
                        public_snippets: 1,
                        totalVoteScore: { $sum: "$public_snippets.vote_score" },
                        publicSnippetCount: { $size: "$public_snippets" },
                        followerCount: { $size: "$followers" },
                        followingCount: { $size: "$following" }
                    }
                }
            ]

            const results = await UserModel.aggregate(pipeline)

            if (!results || results.length === 0) {
                return res.status(StatusCode.NOT_FOUND).json({
                    success: false,
                    message: "User not found"
                })
            }

            // DEBUG — log follow counts to verify DB lookup is working
            const userId = results[0]?._id
            const rawFollowingCount = await FollowModel.countDocuments({ follower_id: userId })
            const rawFollowerCount  = await FollowModel.countDocuments({ following_id: userId })
            console.log(`[Profile:${username}] aggregation following=${results[0]?.followingCount} followers=${results[0]?.followerCount}`)
            console.log(`[Profile:${username}] countDocuments  following=${rawFollowingCount} followers=${rawFollowerCount}`)

            // Override with the reliable counts
            results[0].followingCount = rawFollowingCount
            results[0].followerCount  = rawFollowerCount

            return res.status(StatusCode.SUCCESS).json({
                success: true,
                message: "User public profile fetched successfully",
                data: results[0]
            })

        } catch (error) {
            console.error(error)
            return res.status(StatusCode.SERVER_ERROR).json({
                success: false,
                message: "Failed to fetch user profile"
            })
        }
    }

    async verifyEmail(req, res) {
        try {
            const { token } = req.params

            if (!token) {
                return res.status(StatusCode.BAD_REQUEST).json({ success: false, message: "Verification token is required" })
            }

            const hash = crypto.createHash('sha256').update(token).digest('hex')
            const user = await UserModel.findOne({
                emailVerifyToken: hash,
                emailVerifyExpire: { $gt: Date.now() }
            })

            if (!user) {
                return res.status(StatusCode.BAD_REQUEST).json({ success: false, message: "Invalid or expired verification link. Please register again or request a new link." })
            }

            user.isVerified = true
            user.emailVerifyToken = undefined
            user.emailVerifyExpire = undefined
            await user.save()

            // Send welcome email now that the user is verified
            mailer.sendWelcomeEmail(user.user_email, user.user_name)

            return res.status(StatusCode.SUCCESS).json({ success: true, message: "Email verified successfully! You can now log in." })
        } catch (error) {
            console.error(error)
            return res.status(StatusCode.SERVER_ERROR).json({ success: false, message: "Failed to verify email" })
        }
    }

    async forgotPassword(req, res) {
        try {
            const { user_email } = req.body
            const user = await UserModel.findOne({ user_email })

            if (!user) {
                return res.status(StatusCode.NOT_FOUND).json({ success: false, message: "User not found" })
            }

            const resetToken = crypto.randomBytes(32).toString('hex')
            const hash = crypto.createHash('sha256').update(resetToken).digest('hex')

            user.resetPasswordToken = hash
            user.resetPasswordExpire = Date.now() + 60 * 60 * 1000 // 1 hour

            await user.save()

            await mailer.sendPasswordResetEmail(user.user_email, resetToken)

            return res.status(StatusCode.SUCCESS).json({ success: true, message: "Password reset link sent to email" })
        } catch (error) {
            console.error(error)
            return res.status(StatusCode.SERVER_ERROR).json({ success: false, message: "Failed to process request" })
        }
    }

    async resetPassword(req, res) {
        try {
            const { token } = req.params
            const { new_password } = req.body

            const hash = crypto.createHash('sha256').update(token).digest('hex')
            const user = await UserModel.findOne({
                resetPasswordToken: hash,
                resetPasswordExpire: { $gt: Date.now() }
            })

            if (!user) {
                return res.status(StatusCode.BAD_REQUEST).json({ success: false, message: "Invalid or expired token" })
            }

            user.user_password = await bcrypt.hash(new_password, SALT)
            user.resetPasswordToken = undefined
            user.resetPasswordExpire = undefined

            await user.save()
            return res.status(StatusCode.SUCCESS).json({ success: true, message: "Password reset successful. You can now login." })
        } catch (error) {
            console.error(error)
            return res.status(StatusCode.SERVER_ERROR).json({ success: false, message: "Failed to process reset" })
        }
    }

    async getMyStats(req, res) {
        try {
            const targetUserId = (req.user.role === 'admin' && req.query.userId) ? req.query.userId : req.user.id
            
            console.log(`[MyStats] targetUserId: ${targetUserId} (Requested by: ${req.user.id}, Role: ${req.user.role})`)

            const [totalSnippets, publicSnippets, followingCount, followerCount, voteResult] = await Promise.all([
                SnippetModel.countDocuments({ created_by: targetUserId, is_deleted: { $ne: true } }),
                SnippetModel.countDocuments({ created_by: targetUserId, visibility: 'public', is_deleted: { $ne: true } }),
                FollowModel.countDocuments({ follower_id: targetUserId }),
                FollowModel.countDocuments({ following_id: targetUserId }),
                SnippetModel.aggregate([
                    { $match: { created_by: require('mongoose').Types.ObjectId.isValid(targetUserId) ? new (require('mongoose').Types.ObjectId)(targetUserId) : targetUserId, is_deleted: { $ne: true } } },
                    { $group: { _id: null, total: { $sum: '$vote_score' } } }
                ])
            ])

            const totalVoteScore = voteResult[0]?.total || 0

            console.log('[MyStats] results:', { totalSnippets, publicSnippets, followingCount, followerCount, totalVoteScore })

            return res.status(StatusCode.SUCCESS).json({
                success: true,
                data: {
                    totalSnippets,
                    publicSnippets,
                    followingCount,
                    followerCount,
                    totalVoteScore
                }
            })
        } catch (error) {
            console.error('[MyStats] error:', error)
            return res.status(StatusCode.SERVER_ERROR).json({ success: false, message: "Failed to fetch stats" })
        }
    }

}

module.exports = new AuthController()
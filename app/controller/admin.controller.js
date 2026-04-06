const UserModel = require('../models/user.model')
const SnippetModel = require('../models/snippet.model')
const StatusCode = require('../utils/StatusCode')

class AdminController {

    // ─── GET ALL USERS (paginated) ─────────────────────────────────────
    async getAllUsers(req, res) {
        try {
            const page = parseInt(req.query.page) || 1
            const limit = parseInt(req.query.limit) || 20
            const skip = (page - 1) * limit

            // Optional search by username or email
            const filter = {}
            if (req.query.q) {
                filter.$or = [
                    { user_name: { $regex: req.query.q, $options: 'i' } },
                    { user_email: { $regex: req.query.q, $options: 'i' } }
                ]
            }

            const users = await UserModel.find(filter, '-user_password')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)

            const total = await UserModel.countDocuments(filter)

            return res.status(StatusCode.SUCCESS).json({
                success: true,
                message: "Users fetched successfully",
                data: {
                    users,
                    total,
                    page,
                    totalPages: Math.ceil(total / limit)
                }
            })

        } catch (err) {
            console.error(err)
            return res.status(StatusCode.SERVER_ERROR).json({
                success: false,
                message: "Failed to fetch users"
            })
        }
    }

    // ─── SUSPEND USER ──────────────────────────────────────────────────
    async suspendUser(req, res) {
        try {
            const { id } = req.params

            // Admin cannot suspend themselves
            if (req.user.id === id) {
                return res.status(StatusCode.BAD_REQUEST).json({
                    success: false,
                    message: "You cannot suspend your own account"
                })
            }

            const user = await UserModel.findByIdAndUpdate(
                id,
                { isActive: false },
                { new: true }
            ).select('-user_password')

            if (!user) {
                return res.status(StatusCode.NOT_FOUND).json({
                    success: false,
                    message: "User not found"
                })
            }

            return res.status(StatusCode.SUCCESS).json({
                success: true,
                message: `User "${user.user_name}" has been suspended`,
                data: { id: user._id, user_name: user.user_name, isActive: user.isActive }
            })

        } catch (err) {
            console.error(err)
            return res.status(StatusCode.SERVER_ERROR).json({
                success: false,
                message: "Failed to suspend user"
            })
        }
    }

    // ─── ACTIVATE USER ─────────────────────────────────────────────────
    async activateUser(req, res) {
        try {
            const { id } = req.params

            const user = await UserModel.findByIdAndUpdate(
                id,
                { isActive: true },
                { new: true }
            ).select('-user_password')

            if (!user) {
                return res.status(StatusCode.NOT_FOUND).json({
                    success: false,
                    message: "User not found"
                })
            }

            return res.status(StatusCode.SUCCESS).json({
                success: true,
                message: `User "${user.user_name}" has been activated`,
                data: { id: user._id, user_name: user.user_name, isActive: user.isActive }
            })

        } catch (err) {
            console.error(err)
            return res.status(StatusCode.SERVER_ERROR).json({
                success: false,
                message: "Failed to activate user"
            })
        }
    }

    // ─── GET USER BY ID (admin detail view) ───────────────────────────
    async getUserById(req, res) {
        try {
            const { id } = req.params
            const user = await UserModel.findById(id).select('-user_password')

            if (!user) {
                return res.status(StatusCode.NOT_FOUND).json({
                    success: false,
                    message: "User not found"
                })
            }

            return res.status(StatusCode.SUCCESS).json({
                success: true,
                message: "User fetched successfully",
                data: user
            })

        } catch (err) {
            console.error(err)
            return res.status(StatusCode.SERVER_ERROR).json({
                success: false,
                message: "Failed to fetch user"
            })
        }
    }

    // ─── HARD DELETE ANY SNIPPET (admin) ──────────────────────────────
    async hardDeleteSnippet(req, res) {
        try {
            const { id } = req.params

            const snippet = await SnippetModel.findByIdAndDelete(id)

            if (!snippet) {
                return res.status(StatusCode.NOT_FOUND).json({
                    success: false,
                    message: "Snippet not found"
                })
            }

            return res.status(StatusCode.SUCCESS).json({
                success: true,
                message: "Snippet permanently deleted by admin"
            })

        } catch (err) {
            console.error(err)
            return res.status(StatusCode.SERVER_ERROR).json({
                success: false,
                message: "Failed to delete snippet"
            })
        }
    }

}

module.exports = new AdminController()

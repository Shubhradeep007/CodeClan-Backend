const mongoose = require('mongoose')
const FollowModel = require('../models/follow.model')
const StatusCode = require('../utils/StatusCode')

class FollowController {
    async toggleFollow(req, res) {
        try {
            const rawId = req.user.id
            const rawTargetId = req.params.userId

            console.log('[Follow] req.user.id raw:', rawId, 'type:', typeof rawId)
            console.log('[Follow] target userId:', rawTargetId)

            // Validate ObjectIds before casting
            if (!mongoose.Types.ObjectId.isValid(rawId) || !mongoose.Types.ObjectId.isValid(rawTargetId)) {
                return res.status(StatusCode.BAD_REQUEST).json({
                    success: false,
                    message: "Invalid user ID"
                })
            }

            const followerId  = new mongoose.Types.ObjectId(rawId)
            const followingId = new mongoose.Types.ObjectId(rawTargetId)

            if (followerId.equals(followingId)) {
                return res.status(StatusCode.BAD_REQUEST).json({
                    success: false,
                    message: "You cannot follow yourself"
                })
            }

            // Check with both string and ObjectId to handle old docs
            const existingFollow = await FollowModel.findOne({
                $or: [
                    { follower_id: followerId,  following_id: followingId },
                    { follower_id: rawId,        following_id: rawTargetId }
                ]
            })

            console.log('[Follow] existingFollow:', existingFollow?._id)

            if (existingFollow) {
                await FollowModel.deleteOne({ _id: existingFollow._id })
                // Also clean up any duplicate string-id docs
                await FollowModel.deleteMany({ follower_id: rawId, following_id: rawTargetId })
                return res.status(StatusCode.SUCCESS).json({
                    success: true,
                    message: "User unfollowed successfully",
                    data: { isFollowing: false }
                })
            } else {
                const newFollow = new FollowModel({
                    follower_id: followerId,
                    following_id: followingId
                })
                const saved = await newFollow.save()
                console.log('[Follow] saved doc:', saved._id, 'follower_id type:', typeof saved.follower_id, saved.follower_id)

                return res.status(StatusCode.CREATED).json({
                    success: true,
                    message: "User followed successfully",
                    data: { isFollowing: true }
                })
            }
        } catch (error) {
            console.error('[Follow] Error:', error)
            return res.status(StatusCode.SERVER_ERROR).json({
                success: false,
                message: "Failed to toggle follow"
            })
        }
    }

    async checkStatus(req, res) {
        try {
            const rawId = req.user.id
            const rawTargetId = req.params.userId

            if (!mongoose.Types.ObjectId.isValid(rawId) || !mongoose.Types.ObjectId.isValid(rawTargetId)) {
                return res.status(StatusCode.SUCCESS).json({ success: true, isFollowing: false })
            }

            const followerId  = new mongoose.Types.ObjectId(rawId)
            const followingId = new mongoose.Types.ObjectId(rawTargetId)

            const existingFollow = await FollowModel.findOne({
                $or: [
                    { follower_id: followerId,  following_id: followingId },
                    { follower_id: rawId,        following_id: rawTargetId }
                ]
            })

            return res.status(StatusCode.SUCCESS).json({
                success: true,
                isFollowing: !!existingFollow
            })
        } catch (error) {
            console.error(error)
            return res.status(StatusCode.SERVER_ERROR).json({
                success: false,
                message: "Failed to check follow status"
            })
        }
    }

    async getFollowers(req, res) {
        try {
            const { userId } = req.params
            const docs = await FollowModel.find({ following_id: userId })
                .populate('follower_id', 'user_name user_profile_image')
                .sort({ createdAt: -1 })

            const users = docs.map(d => d.follower_id).filter(Boolean)
            return res.status(StatusCode.SUCCESS).json({ success: true, data: { users } })
        } catch (error) {
            console.error(error)
            return res.status(StatusCode.SERVER_ERROR).json({ success: false, message: "Failed to fetch followers" })
        }
    }

    async getFollowing(req, res) {
        try {
            const { userId } = req.params
            const docs = await FollowModel.find({ follower_id: userId })
                .populate('following_id', 'user_name user_profile_image')
                .sort({ createdAt: -1 })

            const users = docs.map(d => d.following_id).filter(Boolean)
            return res.status(StatusCode.SUCCESS).json({ success: true, data: { users } })
        } catch (error) {
            console.error(error)
            return res.status(StatusCode.SERVER_ERROR).json({ success: false, message: "Failed to fetch following" })
        }
    }
}

module.exports = new FollowController()

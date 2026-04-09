const mongoose = require('mongoose')
const schema = mongoose.Schema

const FollowSchema = new schema({
    follower_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user_model',
        required: true
    },
    following_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user_model',
        required: true
    }
}, { timestamps: true })

// Unique compound index to prevent duplicate follows
FollowSchema.index({ follower_id: 1, following_id: 1 }, { unique: true })
// Index for fast lookup of a user's followers
FollowSchema.index({ following_id: 1 })

const FollowModel = mongoose.model("follow_model", FollowSchema)
module.exports = FollowModel

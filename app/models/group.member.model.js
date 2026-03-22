const mongoose = require('mongoose')
const schema = mongoose.Schema

const GroupMemberSchema = new schema({
    group_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'group_model',
        required: true
    },
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user_model',
        required: true
    },
    member_role: {
        type: String,
        enum: ['owner', 'editor', 'viewer'],
        default: 'viewer'
        // owner  — manage members, publish snippets, delete group
        // editor — create and edit group snippets
        // viewer — read-only access to group snippets
    },
    joined_at: {
        type: Date,
        default: Date.now
    }
})

// Compound unique index — one membership record per user per group
GroupMemberSchema.index({ group_id: 1, user_id: 1 }, { unique: true })

const GroupMemberModel = mongoose.model("group_member_model", GroupMemberSchema)
module.exports = GroupMemberModel
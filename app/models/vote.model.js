const mongoose = require('mongoose')
const schema = mongoose.Schema

const VoteSchema = new schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user_model',
        required: true
    },
    snippet_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'snippet_model',
        required: true
    },
    vote_value: {
        type: Number,
        required: true,
        enum: [1, -1]  // 1 = upvote, -1 = downvote
    }
}, { timestamps: true })

// Compound unique index — one vote per user per snippet at DB level
VoteSchema.index({ user_id: 1, snippet_id: 1 }, { unique: true })

const VoteModel = mongoose.model("vote_model", VoteSchema)
module.exports = VoteModel
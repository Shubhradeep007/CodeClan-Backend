const mongoose = require('mongoose')
const schema = mongoose.Schema

const CommentSchema = new schema({
    snippet_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'snippet_model',
        required: true
    },
    author_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user_model',
        required: true
    },
    parent_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'comment_model',
        default: null  // null = top-level comment, ObjectId = reply to a comment
    },
    comment_body: {
        type: String,
        required: true,
        trim: true,
        maxlength: 2000
    },
    is_deleted: {
        type: Boolean,
        default: false  // soft delete — keeps thread structure intact
    }
}, { timestamps: true })

const CommentModel = mongoose.model("comment_model", CommentSchema)
module.exports = CommentModel
const mongoose = require('mongoose')
const schema = mongoose.Schema

const SnippetSchema = new schema({
    created_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user_model',
        required: true
    },
    group_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'group_model',
        default: null  // null = personal snippet, ObjectId = group-scoped
    },
    snippet_title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 120
    },
    snippet_code: {
        type: String,
        required: true,
        maxlength: 50000
    },
    snippet_language: {
        type: String,
        required: true,
        enum: ['js', 'ts', 'py', 'go', 'rs', 'java', 'cpp', 'bash', 'sql', 'php', 'rb', 'other']
    },
    snippet_description: {
        type: String,
        trim: true,
        maxlength: 500,
        default: ""
    },
    snippet_tags: {
        type: [String],
        default: []
        // max 10 tags, each max 30 chars — validated in controller
    },
    visibility: {
        type: String,
        enum: ['private', 'public', 'group'],
        default: 'private'
    },
    vote_score: {
        type: Number,
        default: 0
    },
    view_count: {
        type: Number,
        default: 0
    },
    published_at: {
        type: Date,
        default: null  // set when snippet is published to public feed
    },
    is_deleted: {
        type: Boolean,
        default: false  // soft delete flag
    }
}, { timestamps: true })

// Full-text search index across title, description, and tags
SnippetSchema.index({ snippet_title: 'text', snippet_description: 'text', snippet_tags: 'text' })

// Compound indexes for fast feed queries
SnippetSchema.index({ visibility: 1, is_deleted: 1, vote_score: -1 })
SnippetSchema.index({ visibility: 1, is_deleted: 1, createdAt: -1 })

const SnippetModel = mongoose.model("snippet_model", SnippetSchema)
module.exports = SnippetModel
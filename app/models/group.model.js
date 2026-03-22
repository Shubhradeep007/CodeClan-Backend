const mongoose = require('mongoose')
const schema = mongoose.Schema
const crypto = require('crypto')

const GroupSchema = new schema({
    owner_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user_model',
        required: true
    },
    group_name: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3,
        maxlength: 50
    },
    group_description: {
        type: String,
        trim: true,
        maxlength: 500,
        default: ""
    },
    group_avatar: {
        type: String,
        default: "default.png"  // Cloudinary URL after upload
    },
    invite_code: {
        type: String,
        unique: true,
        default: () => crypto.randomUUID()  // UUID v4 — no extra package needed
    },
    isActive: {
        type: Boolean,
        default: true  // false = archived group
    }
}, { timestamps: true })

const GroupModel = mongoose.model("group_model", GroupSchema)
module.exports = GroupModel
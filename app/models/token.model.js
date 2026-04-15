const mongoose = require('mongoose')
const schema = mongoose.Schema

const TokenSchema = new schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user_model',
        required: true
    },
    refreshToken: {
        type: String,
        required: true
    },
    expiresAt: {
        type: Date,
        required: true,
        index: { expires: 0 } // TTL index: document will be deleted at this exact time
    }
}, { timestamps: true })

const TokenModel = mongoose.model("token_model", TokenSchema)
module.exports = TokenModel

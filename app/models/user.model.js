const mongoose = require('mongoose')
const schema = mongoose.Schema

const UserSchema = new schema({
    user_name: {
        type: String,
        required: true,
        trim: true,
        minlength: 3,
        maxlength: 30
    },
    user_email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    user_password: {
        type: String,
        required: true
    },
    user_profile_image: {
        type: String,
        default: "default.png"
    },
    user_about: {
        type: String,
        default: ""
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    isActive: {
        type: Boolean,
        default: true 
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date
}, { timestamps: true })

const UserModel = mongoose.model("user_model", UserSchema)
module.exports = UserModel
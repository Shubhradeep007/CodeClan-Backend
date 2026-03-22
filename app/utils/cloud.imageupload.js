const cloudinary = require('cloudinary').v2
const { CloudinaryStorage } = require('multer-storage-cloudinary')
const multer = require('multer')

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
})

// Avatar uploads — goes into codeclan/avatars folder on Cloudinary
const avatarStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'codeclan/avatars',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [{ width: 300, height: 300, crop: 'fill' }]
    }
})

// Group avatar uploads — goes into codeclan/groups folder on Cloudinary
const groupAvatarStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'codeclan/groups',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [{ width: 300, height: 300, crop: 'fill' }]
    }
})

const uploadAvatar = multer({ storage: avatarStorage })
const uploadGroupAvatar = multer({ storage: groupAvatarStorage })

module.exports = { cloudinary, uploadAvatar, uploadGroupAvatar }
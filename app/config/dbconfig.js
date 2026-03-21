require('dotenv').config();

const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URL)
        if (conn) {
            console.log("Database has been connected");
        } else {
            console.log("Unable to connect the database");
        }
    } catch (error) {
        console.log(error);
    }
}


module.exports = connectDB
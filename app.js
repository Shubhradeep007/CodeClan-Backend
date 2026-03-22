require('dotenv').config()
const express = require("express")
const app = express()

app.use(express.json())

const DatabaseConnection = require('./app/config/dbconfig')
DatabaseConnection()

const authRoutes = require('./app/routes/user.route')
app.use('/api/users', authRoutes)

const snippetRoutes = require('./app/routes/snippets.routes')
app.use('/api/snippets', snippetRoutes)

const port = process.env.PORT || 4000
app.listen(port, (err) => {
    if (err) {
        console.log("Unable to start the server");
    } else {
        console.log(`Server has been stated on the port: ${port}`);
    }
})
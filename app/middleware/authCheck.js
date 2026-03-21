const middlewareAuthCheck = async (req, res, next) => {
    const token = req.body?.token || req.query?.token || req.headers["authorization"] || req.headers["x-access-token"]

    if (!token) {
        return res.status(StatusCode.BAD_REQUEST).json({
            success: false,
            message: "Token is required!"
        })
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY)
        req.user = decoded

        console.log("Loggin done: ", req.user);

    } catch (error) {
        return res.status(StatusCode.UNAUTHORIZED).json({
            success: false,
            message: "invalid token"
        })
    }

    return next()
}
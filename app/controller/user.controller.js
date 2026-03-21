class UserController {
    async registerUser(req, res) {
        try {
            const requestPayload = {
                user_name: req.body.user_name,
                user_email: req.body.user_email,
                user_password: req.body.user_password,
                user_profile_image: req.file ? req.file.path : undefined,
                user_about: req.body.user_about,
                role: req.body.role || 'user'
            };

            const { error, value } = UserSchmaValidation.validate(requestPayload);

            if (error) {
                const messages = error.details.map(err => err.message);

                return res.status(StatusCode.BAD_REQUEST).json({
                    success: false,
                    message: messages
                });
            }

            // TODO: Proceed with user registration logic (e.g. save to database)

        } catch (error) {
            return res.status(500).json({
                success: false,
                message: error.message || 'Internal Server Error'
            });
        }
    }
}
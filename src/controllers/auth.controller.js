const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const {User, ProfileAidant, ProfileAide, Subscription} = require('../models');
const {generateEmailToken, sendVerificationEmail, sendResetPasswordEmail} = require('../utils/mail')
const logger = require('../utils/logger');

const register = async (req, res) => {
    const {email, password, first_name, last_name, roleId} = req.body;
    const emailToken = generateEmailToken();

    try {
        // Check if user already exists
        const existingUser = await User.findOne({where: {email}});
        if (existingUser) {
            return res.status(400).json({message: 'E-mail déjà utilisé.'});
        }

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new user
        const newUser = await User.create({
            email: email.toLowerCase(),
            password: hashedPassword,
            first_name,
            last_name,
            roleId,
            is_email_verified: false,
            email_verification_token: emailToken,
        });

        // Send email with the token
        await sendVerificationEmail(newUser, emailToken);

        // Generate Access Token
        const accessToken = jwt.sign(
            {id: newUser.id, email: newUser.email, roleId: newUser.roleId},
            process.env.ACCESS_TOKEN_SECRET,
            {expiresIn: process.env.ACCESS_TOKEN_EXPIRATION || '1d'}
        );

        // Generate Refresh Token
        const refreshToken = jwt.sign(
            {id: newUser.id},
            process.env.REFRESH_TOKEN_SECRET,
            {expiresIn: process.env.REFRESH_TOKEN_EXPIRATION || '7d'}
        );

        // Hash the refresh token before storing it
        await newUser.update({refreshToken: refreshToken});

        // Set the refresh token in a secure HttpOnly cookie
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // Enable in production
            sameSite: 'Strict',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });


        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // Ensure HTTPS in production
            sameSite: 'Strict', // Prevent CSRF
            maxAge: 4 * 60 * 60 * 1000, // 4 hours expiration (for access token)
        });

        res.status(201).json({
            message: 'User registered successfully.',
            user: {
                id: newUser.id,
                roleId: newUser.roleId,
                first_name: newUser.first_name,
                last_name: newUser.last_name,
                email: newUser.email,
                credits: newUser.credits,
                is_email_verified: newUser.is_email_verified,
            }
        });

    } catch (error) {
        console.error('Error during registration:', error);
        logger.error(`API Error: ${error.message}`, {stack: error.stack});
        res.status(500).json({message: error.message || 'An unexpected error occurred.'});
    }
};


const login = async (req, res) => {
    const {email, password} = req.body;
    console.log(req);

    try {
        // Check if the user exists
        const user = await User.findOne({where: {email}});
        if (!user) {
            return res.status(400).json({message: 'Email ou mot de passe invalide.'});
        }

        // Validate the password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({message: 'Email ou mot de passe invalide.'});
        }


        const aidant = await ProfileAidant.findOne({where: {user_id: user.id}})
        if (aidant && !aidant.active) {
            return res.status(400).json({message: 'Ce compte utilisateur est désactivé.'});
        }

        if (aidant) {
            await aidant.update({online: true});
        }

        let aideCount = 0;
        if (aidant) {
            aideCount = await ProfileAide.count({where: {aidant_id: aidant.id}});
        }
        // Generate Access Token
        const accessToken = jwt.sign(
            {id: user.id, email: user.email, roleId: user.roleId},
            process.env.ACCESS_TOKEN_SECRET,
            {
                expiresIn: process.env.ACCESS_TOKEN_EXPIRATION || '1d',
                audience: 'winger',
                issuer: 'winger-backend'
            }
        );

        // Generate Refresh Token
        const refreshToken = jwt.sign(
            {id: user.id},
            process.env.REFRESH_TOKEN_SECRET,
            {
                expiresIn: process.env.REFRESH_TOKEN_EXPIRATION || '7d',
                audience: 'winger',
                issuer: 'winger-backend'
            }
        );

        if (user.roleId == 1) {
            await user.update({is_email_verified: true})
        }

        if (!user.is_email_verified) {
            const emailToken = generateEmailToken();
            console.log(emailToken);
            await sendVerificationEmail(user, emailToken);
            await user.update({refreshToken: refreshToken, email_verification_token: emailToken});
        } else {
            await user.update({refreshToken: refreshToken});
        }

        // Set the refresh token in a secure HttpOnly cookie
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Strict', // Allow refresh on subdomains
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // Ensure HTTPS in production
            sameSite: 'Strict', // Prevent CSRF
            maxAge: 4 * 60 * 60 * 1000, // 4 hours expiration (for access token)
        });

        // 🔍 Fetch subscription info
        const subscription = await Subscription.findOne({
            where: {
                aidant_id: user.id,
                status: 'active'
            },
            attributes: ['id', 'plan_id', 'start_time', 'status'] // customize as needed
        });


        res.status(200).json({
            message: 'Login successful.',
            accessToken,
            user: {
                id: user.id,
                roleId: user.roleId,
                first_name: user.first_name,
                last_name: user.last_name,
                email: user.email,
                credits: user.credits,
                is_email_verified: user.is_email_verified,
                ProfileAidant: aidant ? {
                    profile_pic: aidant.profile_pic,
                    profile_type_id: aidant.profile_type_id,
                    subscription: subscription ? {
                        id: subscription.id,
                        status: subscription.status,
                    } : null
                } : null,
                aideCount: aideCount
            }
        });

    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({message: error.message || 'An unexpected error occurred.'});
    }
}

const refreshToken = async (req, res) => {
    const refreshToken = req.cookies.refreshToken;  // Getting token from cookie

    if (!refreshToken) {
        return res.status(401).json({message: 'No refresh token provided.'});
    }

    try {
        // Decode and verify the refresh token
        const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

        // Find the user associated with the refresh token
        const user = await User.findByPk(decoded.id);

        if (!user) {
            return res.status(401).json({message: 'User not found.'});
        }

        // Compare the hashed refresh token in the DB with the one provided
        const isRefreshTokenValid = refreshToken === user.refreshToken;
        if (!isRefreshTokenValid) {
            return res.status(403).json({message: 'Invalid refresh token.'});
        }

        const aidant = await ProfileAidant.findOne({where: {user_id: user.id}});

        if (aidant) {
            await aidant.update({online: false});
        }

        // Generate new access and refresh tokens
        const newAccessToken = jwt.sign(
            {id: user.id, email: user.email, roleId: user.roleId},
            process.env.ACCESS_TOKEN_SECRET,
            {expiresIn: process.env.ACCESS_TOKEN_EXPIRATION || '1d'}
        );

        const newRefreshToken = jwt.sign(
            {id: user.id},
            process.env.REFRESH_TOKEN_SECRET,
            {expiresIn: process.env.REFRESH_TOKEN_EXPIRATION || '7d'}
        );

        await user.update({refreshToken: newRefreshToken});

        if (aidant) {
            await aidant.update({online: true});
        }

        // Send new refresh token in cookie
        res.cookie('refreshToken', newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Strict',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        // Return new access token
        res.cookie('accessToken', newAccessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // Ensure HTTPS in production
            sameSite: 'Strict', // Prevent CSRF
            maxAge: 4 * 60 * 60 * 1000, // 4 hours expiration (for access token)
        });

        res.json({accessToken: newAccessToken});

    } catch (error) {
        console.error('Error refreshing token:', error);
        res.status(500).json({message: error.message || 'An unexpected error occurred.'});
    }
};

const logout = async (req, res) => {
    try {
        const accessToken = req.cookies.accessToken;
        console.log("help", req);

        if (!accessToken) {
            return res.status(400).json({message: 'No token provided'});
        }

        // Verify and decode the token to get the user id
        const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
        const userId = decoded.id;

        // Use the user ID to clear any data or refresh tokens from the DB
        const user = await User.findByPk(userId);
        await user.update({refreshToken: null});

        const aidant = await ProfileAidant.findOne({where: {user_id: userId}})

        if (aidant) {
            await aidant.update({online: false});
        }

        res.clearCookie('accessToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Strict',
        });

        // Clear the refresh token from the cookie
        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Strict',
        });

        res.status(200).json({message: 'Logged out successfully.'});
    } catch (error) {
        console.error('Error during logout:', error);
        res.status(500).json({message: error.message || 'An unexpected error occurred.'});
    }
};

const logoutMobile = async (req, res) => {
    try {
        let accessToken;
        const authHeader = req.headers.authorization;
        if (authHeader?.startsWith("Bearer ")) {
            accessToken = authHeader.substring(7);
        }

        if (!accessToken) {
            return res.status(400).json({message: 'No token provided'});
        }

        // Verify and decode the token to get the user id
        const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
        const userId = decoded.id;

        // Use the user ID to clear any data or refresh tokens from the DB
        const user = await User.findByPk(userId);
        await user.update({refreshToken: null});

        const aidant = await ProfileAidant.findOne({where: {user_id: userId}})

        if (aidant) {
            await aidant.update({online: false});
        }

        res.clearCookie('accessToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Strict',
        });

        // Clear the refresh token from the cookie
        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Strict',
        });

        res.status(200).json({message: 'Logged out successfully.'});
    } catch (error) {
        console.error('Error during logout:', error);
        res.status(500).json({message: error.message || 'An unexpected error occurred.'});
    }
};

const verifyEmail = async (req, res) => {
    const {token} = req.body;

    try {
        const user = await User.findOne({where: {email_verification_token: token}});

        if (!user) {
            return res.status(400).json({message: 'Le lien de validation de votre adresse e-mail a expiré pour des raisons de sécurité. Un nouveau lien de confirmation vient de vous être envoyé par e-mail.Merci de consulter votre boîte de réception puis de cliquer sur le nouveau lien pour finaliser votre inscription.'});
        }

        // Mark email as verified
        user.is_email_verified = true;
        user.email_verification_token = null; // Clear the token after verification
        await user.save();

        return res.status(200).json({message: 'Email successfully verified.'});
    } catch (error) {
        console.error('Error verifying email:', error);
        res.status(500).json({message: error.message || 'An unexpected error occurred.'});
    }
};

const forgotPassword = async (req, res) => {
    const {email} = req.body;

    try {
        const user = await User.findOne({where: {email}});

        if (!user) {
            return res.status(404).json({message: 'User not found'});
        }

        // Create JWT token for password reset
        const resetToken = jwt.sign({userEmail: user.email}, process.env.JWT_SECRET, {expiresIn: '1h'});
        await sendResetPasswordEmail(user, resetToken);

        res.status(200).json({message: 'Lien de réinitialisation du mot de passe envoyé à votre adresse email'});
    } catch (error) {
        console.error(error);
        logger.error(`API Error: ${error.message}`, {stack: error.stack});
        return res.status(500).json({message: error.message});
    }
}

const resetPassword = async (req, res) => {
    const {token, newPassword} = req.body;

    try {
        // Verify the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Find the user based on the decoded userEmail
        const user = await User.findOne({where: {email: decoded.userEmail}});

        if (!user) {
            return res.status(404).json({message: 'User not found'});
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update the user's password
        await user.update({password: hashedPassword});

        res.status(200).json({message: 'Password reset successful'});
    } catch (error) {
        console.error(error);
        logger.error(`API Error: ${error.message}`, {stack: error.stack});
        return res.status(500).json({message: error.message});
    }
};


const changePassword = async (req, res) => {
    const {userId, oldPassword, newPassword, requiresOldPassword} = req.body;

    try {
        const user = await User.findByPk(userId);

        if (!user) {
            return res.status(404).json({message: 'Utilisateur non trouvé'});
        }

        // Only check old password if required
        if (requiresOldPassword) {
            const isMatch = await bcrypt.compare(oldPassword, user.password);

            if (!isMatch) {
                return res.status(400).json({message: 'Ancien mot de passe incorrect'});
            }
        }

        // Remove the duplicate check - just hash and update
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        await user.update({password: hashedNewPassword});

        res.status(200).json({message: 'Mot de passe mis à jour avec succès'});
    } catch (error) {
        console.error(error);
        return res.status(500).json({message: "Erreur serveur lors du changement de mot de passe"});
    }
};


module.exports = {
    register,
    login,
    refreshToken,
    logout,
    logoutMobile,
    verifyEmail,
    forgotPassword,
    resetPassword,
    changePassword
};


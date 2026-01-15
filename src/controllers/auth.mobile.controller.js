
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, ProfileAidant, ProfileAide, Subscription } = require('../models');
const { generateEmailToken, sendVerificationEmail, generateEmailTokenMobile} = require('../utils/mail');


// MOBILE LOGIN ENDPOINT
const mobileLogin = async (req, res) => {
    const { email, password } = req.body; 

    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: 'Email et mot de passe sont requis.'
        });
    }

    try {
        // Check if the user exists
        const user = await User.findOne({ where: { email: email.toLowerCase() } });
        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Email ou mot de passe invalide.'
            });
        }

        // Validate the password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({
                success: false,
                message: 'Email ou mot de passe invalide.'
            });
        }

        const aidant = await ProfileAidant.findOne({ where: { user_id: user.id } });
        if (aidant && !aidant.active) {
            return res.status(403).json({
                success: false,
                message: 'Ce compte utilisateur est désactivé.'
            });
        }

        if (aidant) {
            await aidant.update({ online: true });
        }

        let aideCount = 0;
        if (aidant) {
            aideCount = await ProfileAide.count({ where: { aidant_id: aidant.id } });
        }

        // Generate mobile-specific tokens (longer expiration)
        const accessToken = jwt.sign(
            {
                id: user.id,
                email: user.email,
                roleId: user.roleId,
                platform: 'mobile'
            },
            process.env.ACCESS_TOKEN_SECRET,
            {
                expiresIn: process.env.ACCESS_TOKEN_EXPIRATION_MOBILE || '24h',
                audience: 'winger-mobile',
                issuer: 'winger-backend'
            }
        );

        // Generate Refresh Token
        const refreshToken = jwt.sign(
            {
                id: user.id,
                platform: 'mobile'
            },
            process.env.REFRESH_TOKEN_SECRET,
            {
                expiresIn: process.env.REFRESH_TOKEN_EXPIRATION_MOBILE || '30d',
                audience: 'winger-mobile',
                issuer: 'winger-backend'
            }
        );

        if (user.roleId == 1) {
            await user.update({ is_email_verified: true });
        }

         await user.update({
                refreshToken: refreshToken
            });

        // Fetch subscription info
        const subscription = await Subscription.findOne({
            where: { aidant_id: user.id },
            attributes: ['id', 'plan_id', 'start_time', 'status']
        });

        res.status(200).json({
            success: true,
            message: 'Connexion réussie.',
            accessToken,
            refreshToken,
            expiresIn: process.env.ACCESS_TOKEN_EXPIRATION_MOBILE || '24h',
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
        console.error('Error during mobile login:', error);
        res.status(500).json({
            success: false,
            message: 'Une erreur inattendue s\'est produite.'
        });
    }
};


module.exports = {
    mobileLogin
};
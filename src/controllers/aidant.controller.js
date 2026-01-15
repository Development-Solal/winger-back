const {
    ProfileAidant,
    ProfileAidantPro,
    ProfileAide,
    User,
    ProfileTypeAidant,
    Subscription,
    sequelize, GdprConsentHistory,
} = require("../models");
const {Op} = require("sequelize");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const {
    generateEmailToken,
    generateEmailTokenMobile,
    sendVerificationEmailMobile,
    sendVerificationEmail,
} = require("../utils/mail");
const logger = require("../utils/logger");

// Multer configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "assets/aidant/profile_pics");
    },
    filename: (req, file, cb) => {
        const extension = path.extname(file.originalname);
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, `aidant-profile-pic-${uniqueSuffix}${extension}`);
    },
});

const gdprConsentService = require("../services/gdprConsentService");

const upload = multer({storage}).single("profile_pic");

const createUser = async (email, hashedPassword, first_name, last_name, emailToken, transaction) => {
    const defaultCredits = parseInt(process.env.DEFAULT_CREDITS_ON_REGISTRATION, 10) || 0;

    return await User.create(
        {
            email: email.toLowerCase(),
            password: hashedPassword,
            first_name,
            last_name,
            roleId: 2, // Role ID for aidants
            is_email_verified: false,
            email_verification_token: emailToken,
            credits: defaultCredits,
        },
        {transaction}
    );
};

const handleMulterUpload = (req, res) => {
    return new Promise((resolve, reject) => {
        upload(req, res, (err) => {
            if (err) {
                console.error("Multer error:", err.message, err.stack);
                return reject({status: 400, message: "File upload failed."});
            }
            if (!req.file) {
                return reject({status: 400, message: "Profile Pic upload failed."});
            }
            resolve();
        });
    });
};

const parseGdprConsents = (gdprConsentsRaw) => {
    return typeof gdprConsentsRaw === 'string'
        ? JSON.parse(gdprConsentsRaw)
        : gdprConsentsRaw;
};

const validateMandatoryConsents = (gdprConsents) => {
    if (!gdprConsents?.cgv || !gdprConsents?.privacy_policy || !gdprConsents?.age_18) {
        throw {
            status: 400,
            message: "Les consentements obligatoires (CGV, Politique de confidentialité, et confirmation 18+) doivent être acceptés."
        };
    }
};

const checkExistingUser = async (email, transaction) => {
    const existingUser = await User.findOne({where: {email}, transaction});
    if (existingUser) {
        throw {status: 400, message: "E-mail déjà utilisé."};
    }
};

const hashPassword = async (password) => {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
};

const findProfileType = async (profile_type, transaction) => {
    const profileType = await ProfileTypeAidant.findOne({
        where: {
            [Op.or]: [{title_fr: profile_type}, {title_eng: profile_type}],
        },
        transaction,
    });

    if (!profileType) {
        throw {status: 400, message: "Profile Type not found."};
    }

    return profileType;
};

const generateProfileNumber = async (prefix, transaction) => {
    const lastProfile = await ProfileAidant.findOne({
        order: [["createdAt", "DESC"]],
        attributes: ["profile_number"],
        transaction,
    });

    let nextNumber = 1;
    if (lastProfile && lastProfile.profile_number) {
        const lastNumber = parseInt(lastProfile.profile_number.split("-")[1], 10);
        nextNumber = lastNumber + 1;
    }

    return `${prefix}-${nextNumber}`;
};

const getProfilePicPath = (file) => {
    return file ? `aidant/profile_pics/${file.filename}` : null;
};

const createGdprConsentRecords = async (userId, profileType, gdprConsents, source, transaction) => {
    const gdprConsent = await gdprConsentService.createConsent(
        userId,
        profileType,
        {
            cgv: gdprConsents.cgv,
            privacy_policy: gdprConsents.privacy_policy,
            age_18: gdprConsents.age_18,
            newsletter: gdprConsents.newsletter || false,
            push: gdprConsents.push || false,
        },
        source,
        transaction
    );

    const consentId = gdprConsent.data.dataValues.consent_id;

    await GdprConsentHistory.createConsentHistory(userId, profileType, consentId, "cgv", false, gdprConsents.cgv, source);
    await GdprConsentHistory.createConsentHistory(userId, profileType, consentId, "privacy_policy", false, gdprConsents.privacy_policy, source);
    await GdprConsentHistory.createConsentHistory(userId, profileType, consentId, "age_18", false, gdprConsents.age_18, source);
    await GdprConsentHistory.createConsentHistory(userId, profileType, consentId, "newsletter", false, gdprConsents.newsletter, source);
    await GdprConsentHistory.createConsentHistory(userId, profileType, consentId, "push", false, gdprConsents.push, source);

    return consentId;
};

const generateTokens = async (newUser) => {
    const activeSubscription = await Subscription.findOne({
        where: {
            aidant_id: newUser.id,
            status: "active",
        },
    });

    const accessToken = jwt.sign(
        {
            id: newUser.id,
            email: newUser.email,
            roleId: newUser.roleId,
            subscriptionStatus: activeSubscription ? "active" : "none",
        },
        process.env.ACCESS_TOKEN_SECRET,
        {expiresIn: process.env.ACCESS_TOKEN_EXPIRATION || "1d"}
    );

    const refreshToken = jwt.sign(
        {id: newUser.id},
        process.env.REFRESH_TOKEN_SECRET,
        {expiresIn: process.env.REFRESH_TOKEN_EXPIRATION || "7d"}
    );

    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await newUser.update({refreshToken: hashedRefreshToken});

    return {accessToken, refreshToken};
};

const setAuthCookie = (res, accessToken) => {
    res.cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Strict",
        maxAge: 4 * 60 * 60 * 1000,
    });
};

const buildUserResponse = (newUser, newProfileAidant, includeAccessToken = false) => {
    const response = {
        message: "ProfileAidant created successfully.",
        user: {
            id: newUser.id,
            first_name: newUser.first_name,
            last_name: newUser.last_name,
            email: newUser.email,
            credits: newUser.credits,
            is_email_verified: newUser.is_email_verified,
            ProfileAidant: {
                profile_pic: newProfileAidant.profile_pic,
                profile_type_id: newProfileAidant.profile_type_id,
            },
        },
    };

    if (includeAccessToken) {
        return response;
    }

    return response;
};

// ============================================================================
// CORE CREATION LOGIC
// ============================================================================

const createProfileAidantCore = async (req, profilePrefix, emailTokenGenerator, emailSender, profileTypeKey, source) => {
    const {
        profile_type,
        first_name,
        last_name,
        email,
        password,
        age,
        closest_town,
        commune,
        active,
        online,
        gdprConsents: gdprConsentsRaw,
    } = req.body;

    const gdprConsents = parseGdprConsents(gdprConsentsRaw);
    const transaction = await sequelize.transaction();

    try {
        await checkExistingUser(email, transaction);
        validateMandatoryConsents(gdprConsents);

        const hashedPassword = await hashPassword(password);
        const emailToken = emailTokenGenerator();
        const newUser = await createUser(email, hashedPassword, first_name, last_name, emailToken, transaction);

        const profileType = await findProfileType(profile_type, transaction);
        const profileNumber = await generateProfileNumber(profilePrefix, transaction);
        const profilePicPath = getProfilePicPath(req.file);

        const newProfileAidant = await ProfileAidant.create(
            {
                id: newUser.id,
                user_id: newUser.id,
                profile_type_id: profileType.id,
                profile_number: profileNumber,
                profile_pic: profilePicPath,
                first_name,
                last_name,
                email: email.toLowerCase(),
                password: hashedPassword,
                age_id: age,
                town_id: closest_town,
                commune_id: commune,
                active,
                online,
                all_required_accepted: true,
            },
            {transaction}
        );

        await createGdprConsentRecords(newUser.id, profileTypeKey, gdprConsents, source, transaction);
        await transaction.commit();
        await emailSender(newUser, emailToken);

        const {accessToken} = await generateTokens(newUser);

        return {newUser, newProfileAidant, accessToken};
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

const createProfileAidantProCore = async (req, profilePrefix, emailTokenGenerator, emailSender, source) => {
    const {
        profile_type,
        first_name,
        last_name,
        email,
        password,
        closest_town,
        company_name,
        company_id,
        company_description,
        active,
        online,
        gdprConsents: gdprConsentsRaw,
    } = req.body;

    const gdprConsents = parseGdprConsents(gdprConsentsRaw);
    const transaction = await sequelize.transaction();

    try {
        await checkExistingUser(email, transaction);
        validateMandatoryConsents(gdprConsents);

        const hashedPassword = await hashPassword(password);
        const emailToken = emailTokenGenerator();
        const newUser = await createUser(email, hashedPassword, first_name, last_name, emailToken, transaction);

        const profileType = await findProfileType(profile_type, transaction);
        const profileNumber = await generateProfileNumber(profilePrefix, transaction);
        const profilePicPath = getProfilePicPath(req.file);

        const newProfileAidant = await ProfileAidant.create(
            {
                id: newUser.id,
                user_id: newUser.id,
                profile_type_id: profileType.id,
                profile_number: profileNumber,
                profile_pic: profilePicPath,
                first_name,
                last_name,
                email: email.toLowerCase(),
                password: hashedPassword,
                age_id: 1,
                town_id: closest_town,
                commune_id: 1,
                active,
                online,
                all_required_accepted: true,
            },
            {transaction}
        );

        const existingAidantWithCompanyId = await ProfileAidantPro.findOne({where: {company_id}, transaction});
        if (existingAidantWithCompanyId && existingAidantWithCompanyId.aidant_id !== newProfileAidant.id) {
            throw {status: 400, message: "SIRET invalide ou déjà utilisé"};
        }

        await ProfileAidantPro.create(
            {
                aidant_id: newProfileAidant.id,
                company_id,
                company_name,
                company_description,
            },
            {transaction}
        );

        await createGdprConsentRecords(newUser.id, "aidant_pro", gdprConsents, source, transaction);
        await transaction.commit();
        await emailSender(newUser, emailToken);

        const {accessToken} = await generateTokens(newUser);

        return {newUser, newProfileAidant, accessToken};
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

// ============================================================================
// EXPORTED CONTROLLER FUNCTIONS
// ============================================================================

const createProfileAidant = async (req, res) => {
    try {
        await handleMulterUpload(req, res);
        const {newUser, newProfileAidant, accessToken} = await createProfileAidantCore(
            req,
            "PAR",
            generateEmailToken,
            sendVerificationEmail,
            "aidant",
            req.body.source || "web"
        );

        setAuthCookie(res, accessToken);
        res.status(201).json(buildUserResponse(newUser, newProfileAidant));
    } catch (error) {
        console.error("Error creating ProfileAidant:", error);
        const errorMessage = error?.errors?.[0]?.message || error.message;
        logger.error(`API Error: ${error.message}`, {stack: error.stack});
        return res.status(error.status || 500).json({message: errorMessage});
    }
};

const createProfileAidantPro = async (req, res) => {
    try {
        await handleMulterUpload(req, res);
        const {newUser, newProfileAidant, accessToken} = await createProfileAidantProCore(
            req,
            "PRO",
            generateEmailToken,
            sendVerificationEmail,
            req.body.source || "web"
        );

        setAuthCookie(res, accessToken);
        res.status(201).json(buildUserResponse(newUser, newProfileAidant));
    } catch (error) {
        console.error("Error creating ProfileAidant:", error);
        return res.status(error.status || 500).json({
            error: "Error creating ProfileAidant",
            message: error.message
        });
    }
};

const createProfileAidantMobile = async (req, res) => {
    try {
        await handleMulterUpload(req, res);
        const {newUser, newProfileAidant, accessToken} = await createProfileAidantCore(
            req,
            "PAR",
            generateEmailTokenMobile,
            sendVerificationEmailMobile,
            "aidant",
            req.body.source || "mobile"
        );

        setAuthCookie(res, accessToken);
        res.status(201).json({
            ...buildUserResponse(newUser, newProfileAidant),
            accessToken
        });
    } catch (error) {
        console.error("Error creating ProfileAidant:", error);
        const errorMessage = error?.errors?.[0]?.message || error.message;
        logger.error(`API Error: ${error.message}`, {stack: error.stack});
        return res.status(error.status || 500).json({message: errorMessage});
    }
};

const createProfileAidantProMobile = async (req, res) => {
    try {
        await handleMulterUpload(req, res);
        const {newUser, newProfileAidant, accessToken} = await createProfileAidantProCore(
            req,
            "PRO",
            generateEmailTokenMobile,
            sendVerificationEmailMobile,
            req.body.source || "mobile"
        );

        setAuthCookie(res, accessToken);
        res.status(201).json({
            ...buildUserResponse(newUser, newProfileAidant),
            accessToken
        });
    } catch (error) {
        console.error("Error creating ProfileAidant:", error);
        return res.status(error.status || 500).json({
            error: "Error creating ProfileAidant",
            message: error.message
        });
    }
};

const updateProfileAidant = async (req, res) => {
    try {
        await handleMulterUpload(req, res);
    } catch (uploadError) {
        // Allow updates without file upload
        if (uploadError.message !== "Profile Pic upload failed.") {
            return res.status(uploadError.status || 400).json({message: uploadError.message});
        }
    }

    const {userId} = req.params;
    const {first_name, last_name, email, age, closest_town, commune} = req.body;
    const transaction = await sequelize.transaction();

    try {
        const profileAidant = await ProfileAidant.findOne({where: {user_id: userId}}, {transaction});
        if (!profileAidant) {
            await transaction.rollback();
            return res.status(404).json({message: "ProfileAidant not found."});
        }

        const user = await User.findByPk(profileAidant.user_id, {transaction});
        if (!user) {
            await transaction.rollback();
            return res.status(404).json({message: "User not found."});
        }

        if (email && email !== user.email) {
            const existingUser = await User.findOne({where: {email}, transaction});
            if (existingUser) {
                await transaction.rollback();
                return res.status(400).json({message: "E-mail déjà utilisé."});
            }
            user.email = email;
        }

        user.first_name = first_name || user.first_name;
        user.last_name = last_name || user.last_name;
        await user.save({transaction});

        let profilePicPath = profileAidant.profile_pic;
        if (req.file) {
            if (profileAidant.profile_pic) {
                const oldPicPath = path.join(__dirname, "../assets", profileAidant.profile_pic);
                if (fs.existsSync(oldPicPath)) {
                    fs.unlinkSync(oldPicPath);
                }
            }
            profilePicPath = getProfilePicPath(req.file);
        }

        await profileAidant.update(
            {
                first_name,
                last_name,
                email,
                profile_pic: profilePicPath,
                age_id: age,
                town_id: closest_town,
                commune_id: commune
            },
            {transaction}
        );

        await transaction.commit();

        res.status(200).json({
            message: "ProfileAidant updated successfully.",
            user: {
                id: user.id,
                first_name: user.first_name,
                last_name: user.last_name,
                email: user.email,
                credits: user.credits,
                is_email_verified: user.is_email_verified,
                ProfileAidant: {
                    profile_pic: profileAidant.profile_pic,
                    profile_type_id: profileAidant.profile_type_id
                },
            },
        });
    } catch (error) {
        await transaction.rollback();
        console.error("Error updating ProfileAidant:", error);
        return res.status(500).json({message: error.message});
    }
};

const updateProfileAidantPro = async (req, res) => {
    try {
        await handleMulterUpload(req, res);
    } catch (uploadError) {
        if (uploadError.message !== "Profile Pic upload failed.") {
            return res.status(uploadError.status || 400).json({message: uploadError.message});
        }
    }

    const {userId} = req.params;
    const {
        first_name,
        last_name,
        email,
        closest_town,
        company_name,
        company_id,
        company_description,
    } = req.body;

    const transaction = await sequelize.transaction();

    try {
        const profileAidant = await ProfileAidant.findOne({where: {user_id: userId}}, {transaction});
        if (!profileAidant) {
            await transaction.rollback();
            return res.status(404).json({message: "ProfileAidant not found."});
        }

        const user = await User.findByPk(profileAidant.user_id, {transaction});
        if (!user) {
            await transaction.rollback();
            return res.status(404).json({message: "User not found."});
        }

        if (email && email !== user.email) {
            const existingUser = await User.findOne({where: {email}, transaction});
            if (existingUser) {
                await transaction.rollback();
                return res.status(400).json({message: "E-mail déjà utilisé."});
            }
            user.email = email;
        }

        user.first_name = first_name || user.first_name;
        user.last_name = last_name || user.last_name;
        await user.save({transaction});

        let profilePicPath = profileAidant.profile_pic;
        if (req.file) {
            if (profileAidant.profile_pic) {
                const oldPicPath = path.join(__dirname, "../assets", profileAidant.profile_pic);
                if (fs.existsSync(oldPicPath)) {
                    fs.unlinkSync(oldPicPath);
                }
            }
            profilePicPath = getProfilePicPath(req.file);
        }

        await profileAidant.update(
            {
                first_name,
                last_name,
                email,
                profile_pic: profilePicPath,
                town_id: closest_town,
            },
            {transaction}
        );

        const profileAidantPro = await ProfileAidantPro.findOne(
            {where: {aidant_id: profileAidant.id}},
            {transaction}
        );
        if (!profileAidantPro) {
            await transaction.rollback();
            return res.status(404).json({message: "ProfileAidantPro not found."});
        }

        await profileAidantPro.update(
            {
                company_id,
                company_name,
                company_description,
            },
            {transaction}
        );

        await transaction.commit();

        res.status(200).json({
            message: "ProfileAidant updated successfully.",
            user: {
                id: user.id,
                first_name: user.first_name,
                last_name: user.last_name,
                email: user.email,
                credits: user.credits,
                is_email_verified: user.is_email_verified,
                ProfileAidant: {
                    profile_pic: profileAidant.profile_pic,
                    profile_type_id: profileAidant.profile_type_id
                },
            },
        });
    } catch (error) {
        await transaction.rollback();
        console.error("Error updating ProfileAidant:", error);
        return res.status(500).json({message: error.message});
    }
};

const deactivateProfileAidant = async (req, res) => {
    const {userId} = req.params;
    const transaction = await sequelize.transaction();

    try {
        const profileAidant = await ProfileAidant.findOne({where: {user_id: userId}}, {transaction});
        if (!profileAidant) {
            await transaction.rollback();
            return res.status(404).json({message: "ProfileAidant not found."});
        }

        await profileAidant.update({active: false}, {transaction});
        await ProfileAide.update({active: false}, {where: {aidant_id: userId}, transaction});

        await transaction.commit();
        res.status(200).json({message: "Aidant and linked Aides deactivated successfully."});
    } catch (error) {
        await transaction.rollback();
        console.error("Error deactivating ProfileAidant:", error);
        return res.status(500).json({message: error.message});
    }
};

const aidantDeactivateProfileAidant = async (req, res) => {
    const {userId} = req.params;
    const transaction = await sequelize.transaction();

    try {
        const profileAidant = await ProfileAidant.findOne({where: {user_id: userId}}, {transaction});
        if (!profileAidant) {
            await transaction.rollback();
            return res.status(404).json({message: "ProfileAidant not found."});
        }

        const newDeactivatedStatus = !profileAidant.aidant_deactivated;

        await profileAidant.update({aidant_deactivated: newDeactivatedStatus}, {transaction});
        await ProfileAide.update(
            {aidant_deactivated: newDeactivatedStatus},
            {where: {aidant_id: userId}, transaction}
        );

        await transaction.commit();
        res.status(200).json({message: "Aidant and linked Aides deactivated successfully."});
    } catch (error) {
        await transaction.rollback();
        console.error("Error deactivating ProfileAidant:", error);
        return res.status(500).json({message: error.message});
    }
};

const updateAidantProContractSignature = async (req, res) => {
    const {userId} = req.params;
    const transaction = await sequelize.transaction();

    try {
        const profileAidant = await ProfileAidant.findOne({where: {user_id: userId}}, {transaction});
        if (!profileAidant) {
            await transaction.rollback();
            return res.status(404).json({message: "ProfileAidant not found."});
        }

        const profileAidantPro = await ProfileAidantPro.findOne(
            {where: {aidant_id: profileAidant.id}},
            {transaction}
        );
        if (!profileAidantPro) {
            await transaction.rollback();
            return res.status(404).json({message: "ProfileAidantPro not found."});
        }

        await profileAidantPro.update(
            {contract_signed: !profileAidantPro.contract_signed},
            {transaction}
        );

        await transaction.commit();
        res.status(200).json({message: "Contract for profile aidant pro signed successfully"});
    } catch (error) {
        await transaction.rollback();
        console.error("Error signing Profile aidant pro contract:", error);
        return res.status(500).json({message: error.message});
    }
};
module.exports = {
    createProfileAidant,
    createProfileAidantPro,
    createProfileAidantMobile,
    createProfileAidantProMobile,
    updateProfileAidant,
    deactivateProfileAidant,
    updateProfileAidantPro,
    updateAidantProContractSignature,
    aidantDeactivateProfileAidant
};
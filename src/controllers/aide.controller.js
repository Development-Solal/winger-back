const {
    ProfileAide,
    FutureMoitie,
    ProfileAidant,
    ProfileAidantPro,
    GdprAide,
    GdprConsent,
    ListAge,
    ListOrigine,
    ListReligion,
    ListEducation,
    ListHeight,
    ListSilhouette,
    ListSmoker,
    ListTattoo,
    ListKid,
    ListPassion,
    ListLanguage,
    ListNationality,
    ListTown,
    ListCommune,
    ListTownOption,
    Conversation, Message, MessageStatus, Participant,
    sequelize, GdprConsentHistory, Favorite,
} = require("../models");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const logger = require("../utils/logger");

//new
const {
    uploadToO2Switch,
    cleanupTempFile,
    getPublicUrl
} = require("../utils/fileUpload");

//new
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, '/tmp');
    },
    filename: (req, file, cb) => {
        cb(null, `temp-${Date.now()}${path.extname(file.originalname)}`);
    }
});

// Multer configuration
const storage2 = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "assets/aide/profile_pics");
    },
    filename: (req, file, cb) => {
        const extension = path.extname(file.originalname);
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, `aide-profile-pic-${uniqueSuffix}${extension}`);
    },
});

//new
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }
}).single("profile_pic");

const upload2 = multer({storage}).single("profile_pic");

//new
const handleMulterUpload = (req, res, fileType) => {
    return new Promise((resolve, reject) => {
        upload(req, res, async (err) => {
            if (err) {
                return reject({ status: 400, message: "File upload failed." });
            }

            if (!req.file) {
                return reject({ status: 400, message: "No file uploaded." });
            }

            try {
                console.log('📤 Uploading to o2switch...', {
                    type: fileType,
                    original: req.file.originalname
                });

                // Upload to o2switch with specific type
                const result = await uploadToO2Switch(
                    req.file.path,
                    fileType
                );

                console.log('✅ Upload successful:', result);

                // Cleanup temp
                await cleanupTempFile(req.file.path);

                // Add to req
                req.uploadedFile = {
                    url: result.url,
                    path: result.path,
                    filename: result.filename
                };

                resolve();

            } catch (uploadError) {
                await cleanupTempFile(req.file.path);
                reject({
                    status: 500,
                    message: "Upload to storage failed"
                });
            }
        });
    });
};

//new
const getProfilePicPath = (req) => {
    return req.uploadedFile ? req.uploadedFile.path : null;
};

const convertToNull = (value) => (value === "" ? null : value);

// Create a new ProfileAide
const createProfileAide = async (req, res) => {
    console.log("inside create profile aide" , req);

        const transaction = await sequelize.transaction();

        try {
            await handleMulterUpload(req, res, 'aide-profile-pic');
            const profilePicPath = getProfilePicPath(req);
            const profileData = extractProfileData(req);
            const aidant = await validateAidant(profileData.userEmail, transaction);

            await validateAideLimit(aidant, profileData.gdpr_aide_id, transaction);

            const profileNumber = await generateProfileNumber(transaction);
            //const profilePicPath = req.file ? `aide/profile_pics/${req.file.filename}` : null;
            const allRequired = await checkRequiredAcceptance(aidant, profileData.gdpr_aide_id, transaction);
            console.log("allRequired",allRequired);

            const newProfileAide = await createProfileAideRecord(
                profileData,
                aidant.id,
                profileNumber,
                profilePicPath,
                allRequired,
                transaction
            );

            await setProfileRelations(newProfileAide, profileData, transaction);
            await createFutureMoitieRecord(newProfileAide.id, profileData, transaction);
            console.log("profile data", profileData);
            await handleGdprConsent(newProfileAide, aidant, profileData.gdpr_aide_id, profileData.source, transaction);

            await transaction.commit();
            res.status(201).json(newProfileAide);

        } catch (error) {
            if (transaction.finished !== "rollback") {
                await transaction.rollback();
            }
            handleError(error, res);
        }
};

// ============ Helper Functions ============

function extractProfileData(req) {
    const { body } = req;
    return {
        // Aide basic info
        gdpr_aide_id : body.gdpr_aide_id,
        aidant_is_aide: body.aidant_is_aide,
        gender: body.gender,
        name: body.name,
        age: body.age,
        closest_town: body.closest_town,
        commune: body.commune,
        aidant_relation: body.aidant_relation,
        origine: body.origine,
        nationality: body.nationality,
        language: body.language,
        religion: body.religion,
        education: body.education,
        height: body.height,
        silhouette: body.silhouette,
        smoker: body.smoker,
        tatoo: body.tatoo,
        kids: body.kids,
        passions: body.passions,
        description: body.description,
        active: body.active,
        userEmail: body.userEmail,
        source: body.source,

        // Future Moitie data
        FMgender: body.FMgender,
        FMage: body.FMage,
        FMtown: body.FMtown,
        FMorigine: body.FMorigine,
        FMnationality: body.FMnationality,
        FMlanguage: body.FMlanguage,
        FMreligion: body.FMreligion,
        FMeducation: body.FMeducation,
        FMheight: body.FMheight,
        FMsilhouette: body.FMsilhouette,
        FMsmoker: body.FMsmoker,
        FMtatoo: body.FMtatoo,
        FMkids: body.FMkids,
        FMpassions: body.FMpassions,
        FMdescription: body.FMdescription,
    };
}

async function validateAidant(userEmail, transaction) {
    const aidant = await ProfileAidant.findOne({
        where: { email: userEmail },
        transaction
    });

    if (!aidant) {
        throw new Error("AIDANT_NOT_FOUND");
    }

    return aidant;
}

async function validateAideLimit(aidant, gdprAideId, transaction) {
    if (aidant.profile_type_id !== 1) return;

    const activeCount = await ProfileAide.count({
        where: { aidant_id: aidant.id },
        transaction
    });

    const pendingCount = await GdprAide.count({
        where: {
            aidant_id: aidant.id,
            profile_aide_id: null
        },
        transaction
    });

    const totalCount = activeCount + pendingCount;
    const limit = 3;

    if (totalCount > limit) {
        throw new Error(`LIMIT_EXCEEDED:${activeCount}:${pendingCount}:${limit}`);
    }
}

async function generateProfileNumber(transaction) {
    const lastProfile = await ProfileAide.findOne({
        order: [["createdAt", "DESC"]],
        attributes: ["profile_number"],
        transaction,
    });

    let nextNumber = 1;
    if (lastProfile && lastProfile.profile_number) {
        const lastNumber = parseInt(lastProfile.profile_number.split("-")[1], 10);
        nextNumber = lastNumber + 1;
    }

    return `AID-${nextNumber}`;
}

async function checkRequiredAcceptance(aidant, gdprAideId, transaction) {
    if (aidant.profile_type_id === 1) {
        return !!gdprAideId;
    }

    const aidantPro = await ProfileAidantPro.findOne({
        where: { aidant_id: aidant.id },
        transaction
    });
    console.log("Aidant pro", aidantPro);
    if(!aidantPro) {
        throw new Error("AIDANT_NOT_FOUND");
    }

    return aidantPro.contract_signed;
}

async function createProfileAideRecord(profileData, aidantId, profileNumber, profilePicPath, allRequired, transaction) {
    return await ProfileAide.create({
        aidant_id: aidantId,
        profile_number: profileNumber,
        profile_pic: profilePicPath,
        aidant_is_aide: profileData.aidant_is_aide,
        name: profileData.name,
        gender: profileData.gender,
        town_id: convertToNull(profileData.closest_town),
        commune_id: convertToNull(profileData.commune),
        aidant_relation: profileData.aidant_relation,
        age_id: convertToNull(profileData.age),
        origine_id: convertToNull(profileData.origine),
        nationality_id: convertToNull(profileData.nationality),
        religion_id: convertToNull(profileData.religion),
        education_id: convertToNull(profileData.education),
        height_id: convertToNull(profileData.height),
        silhouette_id: convertToNull(profileData.silhouette),
        smoker_id: convertToNull(profileData.smoker),
        tattoo_id: convertToNull(profileData.tatoo),
        description: profileData.description,
        active: true,
        all_required_accepted: allRequired,
    }, { transaction });
}

async function setProfileRelations(profile, data, transaction) {
    const relations = [
        { field: 'passions', setter: 'setPassions' },
        { field: 'language', setter: 'setLanguage' },
        { field: 'kids', setter: 'setKids' }
    ];

    for (const { field, setter } of relations) {
        if (data[field] && data[field].length > 0) {
            const array = data[field].split(",").map(Number);
            await profile[setter](array, { transaction });
        }
    }
}

async function createFutureMoitieRecord(aideId, data, transaction) {
    const futureMoitie = await FutureMoitie.create({
        aide_id: aideId,
        gender: convertToNull(data.FMgender),
        description: data.FMdescription,
    }, { transaction });

    await setFutureMoitieRelations(futureMoitie, data, transaction);
}

async function setFutureMoitieRelations(futureMoitie, data, transaction) {
    const relations = [
        { field: 'FMage', setter: 'setAges' },
        { field: 'FMorigine', setter: 'setOrigines' },
        { field: 'FMnationality', setter: 'setNationalities' },
        { field: 'FMtown', setter: 'setTownOptions' },
        { field: 'FMpassions', setter: 'setPassions' },
        { field: 'FMkids', setter: 'setKids' },
        { field: 'FMreligion', setter: 'setReligions' },
        { field: 'FMlanguage', setter: 'setLanguages' },
        { field: 'FMeducation', setter: 'setEducations' },
        { field: 'FMheight', setter: 'setHeights' },
        { field: 'FMsilhouette', setter: 'setSilhouettes' },
        { field: 'FMsmoker', setter: 'setSmokers' },
        { field: 'FMtatoo', setter: 'setTattoos' }
    ];

    for (const { field, setter } of relations) {
        if (data[field] && data[field].length > 0) {
            const array = data[field].split(",").map(Number);
            await futureMoitie[setter](array, { transaction });
        }
    }
}

async function handleGdprConsent(profileAide, aidant, gdprAideId, source, transaction) {
    if (gdprAideId) {
        await handleExistingGdprConsent(profileAide, gdprAideId, source, transaction);
    } else {
        await createNewGdprConsent(profileAide, aidant, source, transaction);
    }
}

async function handleExistingGdprConsent(profileAide, gdprAideId, source, transaction) {
    console.log("Linking ProfileAide to GdprAide:", gdprAideId);

    await GdprAide.update(
        { profile_aide_id: profileAide.id },
        { where: { id: gdprAideId }, transaction }
    );

    await GdprConsent.update(
        {
            entity_id: profileAide.id,
            entity_type: "aide",
        },
        {
            where: {
                entity_id: gdprAideId,
                entity_type: "aide_pending",
            },
            transaction,
        }
    );

    const latestConsent = await GdprConsent.findOne({
        where: { entity_id: profileAide.id },
        order: [['created_at', 'DESC']],
        transaction  // Add the transaction here
    });

    console.log("consent",latestConsent);

    const { consent_id, consent } = latestConsent;

    await createConsentHistoryRecords(profileAide.id, consent_id, consent, source);
}

async function createNewGdprConsent(profileAide, aidant, source, transaction) {
    const latestConsent = await GdprConsent.findOne({
        where: { entity_id: aidant.id },
        order: [['created_at', 'DESC']]
    });

    const gdprConsent = await GdprConsent.create({
        entity_id: profileAide.id,
        entity_type: 'aide',
        consent: latestConsent.consent,
        source: source,
        status: true
    });

    await createConsentHistoryRecords(profileAide.id, latestConsent.consent_id, latestConsent.consent, source);
}

async function createConsentHistoryRecords(entityId, consentId, consent, source) {
    const consentTypes = ['cgv', 'privacy_policy', 'age_18', 'newsletter', 'push'];

    for (const type of consentTypes) {
        console.log("type :", type);
        console.log("consent :", consent[type]);
        if (consent[type]) {
            await GdprConsentHistory.createConsentHistory(
                entityId,
                "aide",
                consentId,
                type,
                false,
                consent[type].status,
                source
            );
        }
    }
}

function handleError(error, res) {
    console.error("Error creating ProfileAide:", error);
    logger.error(`API Error: ${error.message}`, { stack: error.stack });

    if (error.message === "AIDANT_NOT_FOUND") {
        return res.status(400).json({ message: "Aidant does not exist." });
    }

    if (error.message.startsWith("LIMIT_EXCEEDED")) {
        const [, activeCount, pendingCount, limit] = error.message.split(":");
        return res.status(400).json({
            message: `Vous avez atteint la limite de ${limit} aidés (${activeCount} actifs + ${pendingCount} en attente). Veuillez supprimer un aidé existant avant d'en ajouter un nouveau.`
        });
    }

    const errorMessage = error?.errors?.[0]?.message || "An unexpected error occurred.";
    return res.status(500).json({ message: errorMessage });
}

const getAllAideByAidant = async (req, res) => {
    const {userId} = req.params;

    try {
        const aidant = await ProfileAidant.findOne({
            where: {user_id: userId, all_required_accepted : true , active:true , aidant_deactivated:false},
            attributes: ["id"],
        });

        if (!aidant) {
            return res.status(404).json({error: "Aidant not found"});
        }

        const allAides = await ProfileAide.findAll({
            where: {aidant_id: aidant.id, is_suspended: false , all_required_accepted: true},
            attributes: ["id", "profile_number", "name", "active"],
            order: [["id", "ASC"]],
        });

        res.json(allAides);
    } catch (error) {
        res.status(500).json({error: error.message});
    }
};

const getAllProfileAides = async (req, res) => {
    try {
        const profiles = await ProfileAide.findAll({
            include: [
                {model: ProfileAidant, as: "aidant"},
                {model: ListAge, as: "age"},
                {model: ListOrigine, as: "origine"},
                {model: ListReligion, as: "religion"},
                {model: ListEducation, as: "education"},
                {model: ListHeight, as: "height"},
                {model: ListSilhouette, as: "silhouette"},
                {model: ListSmoker, as: "smoker"},
                {model: ListTattoo, as: "tatoo"},
                {model: ListNationality, as: "nationality"},
                {model: ListTown, as: "town"},
                {model: ListCommune, as: "commune"},
                {model: ListKid, as: "kids", through: {attributes: []}},
                {model: ListPassion, as: "passions", through: {attributes: []}},
                {model: ListLanguage, as: "language", through: {attributes: []}},
            ],
        });
        res.json(profiles);
    } catch (error) {
        res.status(500).json({error: error.message});
    }
};

const getProfileAideById = async (req, res) => {
    try {
        // First try to get ProfileAide
        let profile = await ProfileAide.findByPk(req.params.id, {
            include: [
                {model: ListAge, as: "age"},
                {model: ListOrigine, as: "origine"},
                {model: ListReligion, as: "religion"},
                {model: ListEducation, as: "education"},
                {model: ListHeight, as: "height"},
                {model: ListSilhouette, as: "silhouette"},
                {model: ListSmoker, as: "smoker"},
                {model: ListTattoo, as: "tattoo"},
                {model: ListNationality, as: "nationality"},
                {model: ListTown, as: "town"},
                {model: ListCommune, as: "commune"},
                {model: ListKid, as: "kids", through: {attributes: []}},
                {model: ListPassion, as: "passions", through: {attributes: []}},
                {model: ListLanguage, as: "language", through: {attributes: []}},
            ],
        });

        // If ProfileAide found, return it
        if (profile) {
            return res.json(profile);
        }

        // If not found, try to get GdprAide
        const gdprAide = await GdprAide.findByPk(req.params.id);

        if (gdprAide) {
            // Return GdprAide data (for pending Aides)
            return res.json({
                id: gdprAide.id,
                email: gdprAide.email_aide,
                email_aide: gdprAide.email_aide,
                consent: gdprAide.consent,
                profile_aide_id: gdprAide.profile_aide_id,
            });
        }

        // Neither found
        return res.status(404).json({error: "Profile not found"});
    } catch (error) {
        console.error("Error getting Aide by ID:", error);
        res.status(500).json({error: error.message});
    }
};

// Rest of functions unchanged...
const getFutureMoitieById = async (req, res) => {
    try {
        const FM = await FutureMoitie.findOne({
            where: {aide_id: req.params.id},
            include: [
                {model: ListOrigine, as: "origines", through: {attributes: []}},
                {model: ProfileAide, as: "aide", attributes: ["name"]},
                {model: ListNationality, as: "nationalities", through: {attributes: []}},
                {model: ListAge, as: "ages", through: {attributes: []}},
                {model: ListTownOption, as: "townOptions", through: {attributes: []}},
                {model: ListKid, as: "kids", through: {attributes: []}},
                {model: ListPassion, as: "passions", through: {attributes: []}},
                {model: ListReligion, as: "religions", through: {attributes: []}},
                {model: ListLanguage, as: "languages", through: {attributes: []}},
                {model: ListEducation, as: "educations", through: {attributes: []}},
                {model: ListHeight, as: "heights", through: {attributes: []}},
                {model: ListSilhouette, as: "silhouettes", through: {attributes: []}},
                {model: ListSmoker, as: "smokers", through: {attributes: []}},
                {model: ListTattoo, as: "tattoos", through: {attributes: []}},
            ],
        });

        if (!FM) {
            return res.status(404).json({error: "Future Moitie not found"});
        }

        res.json(FM);
    } catch (error) {
        console.error("Error fetching Future Moitie:", error);
        res.status(500).json({error: error.message});
    }
};

const updateProfileAide = async (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            console.error("Multer error:", err);
            return res.status(400).json({message: "File upload failed."});
        }

        const {aideId} = req.params;
        const {
            gender,
            aidant_is_aide,
            name,
            age,
            closest_town,
            commune,
            aidant_relation,
            origine,
            nationality,
            language,
            religion,
            education,
            height,
            silhouette,
            smoker,
            tatoo,
            kids,
            passions,
            description,
            active,
        } = req.body;

        const transaction = await sequelize.transaction();

        try {
            const profileAide = await ProfileAide.findByPk(aideId, {transaction});
            if (!profileAide) {
                await transaction.rollback();
                return res.status(404).json({message: "Aide profile not found."});
            }

            let profilePicPath = profileAide.profile_pic;

            if (req.file) {
                profilePicPath = req.file ? `aide/profile_pics/${req.file.filename}` : null;

                if (profileAide.profile_pic) {
                    const oldPicPath = path.join(__dirname, "../assets", profileAide.profile_pic);
                    fs.unlink(oldPicPath, (err) => {
                        if (err && err.code !== "ENOENT") {
                            console.error("Error deleting old profile picture:", err);
                        }
                    });
                }
            }

            await profileAide.update(
                {
                    profile_pic: profilePicPath,
                    name,
                    gender,
                    aidant_is_aide: aidant_is_aide,
                    town_id: convertToNull(closest_town),
                    commune_id: convertToNull(commune),
                    aidant_relation,
                    age_id: convertToNull(age),
                    origine_id: convertToNull(origine),
                    nationality_id: convertToNull(nationality),
                    religion_id: convertToNull(religion),
                    education_id: convertToNull(education),
                    height_id: convertToNull(height),
                    silhouette_id: convertToNull(silhouette),
                    smoker_id: convertToNull(smoker),
                    tattoo_id: convertToNull(tatoo),
                    description,
                    active,
                },
                {transaction}
            );

            const passionArray = (Array.isArray(passions) ? passions : passions ? passions.split(",") : [])
                .map(Number)
                .filter((n) => !isNaN(n));

            await profileAide.setPassions(passionArray, {transaction});

            const kidsArray = (Array.isArray(kids) ? kids : kids ? kids.split(",") : []).map(Number).filter((n) => !isNaN(n));

            await profileAide.setKids(kidsArray, {transaction});

            const languageArray = (Array.isArray(language) ? language : language ? language.split(",") : [])
                .map(Number)
                .filter((n) => !isNaN(n));

            await profileAide.setLanguage(languageArray, {transaction});

            await transaction.commit();

            res.status(200).json({message: "Profile updated successfully", profileAide});
        } catch (error) {
            if (transaction.finished !== "rollback") {
                await transaction.rollback();
            }
            console.error("Error updating ProfileAide:", error);
            return res.status(500).json({message: error.message || "An unexpected error occurred."});
        }
    });
};

const updateFutureMoitie = async (req, res) => {
    console.log("req", req);
    console.log("updating future moitié", req);
    upload(req, res, async (err) => {
        const {aideId} = req.params;
        const {
            FMgender,
            FMage,
            FMtown,
            FMorigine,
            FMnationality,
            FMlanguage,
            FMreligion,
            FMeducation,
            FMheight,
            FMsilhouette,
            FMsmoker,
            FMtatoo,
            FMkids,
            FMpassions,
            FMdescription,
        } = req.body;

        const transaction = await sequelize.transaction();

        try {
            const FM = await FutureMoitie.findOne({
                where: {aide_id: aideId},
                transaction,
            });

            if (!FM) {
                await transaction.rollback();
                return res.status(404).json({message: "Future Moitie not found."});
            }

            await FM.update(
                {
                    gender: convertToNull(FMgender),
                    description: FMdescription,
                },
                {transaction}
            );

            if (FMage?.length > 0) {
                const FMageArray = FMage.split(",").map(Number);
                await FM.setAges(FMageArray, {transaction});
            }
            if (FMorigine?.length > 0) {
                const FMorigineArray = FMorigine.split(",").map(Number);
                await FM.setOrigines(FMorigineArray, {transaction});
            }
            if (FMnationality?.length > 0) {
                const FMnationalityArray = FMnationality.split(",").map(Number);
                await FM.setNationalities(FMnationalityArray, {transaction});
            }

            if (FMtown?.length > 0) {
                const FMtownArray = FMtown.split(",").map(Number);
                await FM.setTownOptions(FMtownArray, {transaction});
            }

            if (FMpassions?.length > 0) {
                const FMpassionsArray = FMpassions.split(",").map(Number);
                await FM.setPassions(FMpassionsArray, {transaction});
            }

            if (FMkids?.length > 0) {
                const FMkidsArray = FMkids.split(",").map(Number);
                await FM.setKids(FMkidsArray, {transaction});
            }

            if (FMreligion?.length > 0) {
                const FMreligionArray = FMreligion.split(",").map(Number);
                await FM.setReligions(FMreligionArray, {transaction});
            }
            if (FMlanguage?.length > 0) {
                const FMlanguageArray = FMlanguage.split(",").map(Number);
                await FM.setLanguages(FMlanguageArray, {transaction});
            }
            if (FMeducation?.length > 0) {
                const FMeducationArray = FMeducation.split(",").map(Number);
                await FM.setEducations(FMeducationArray, {transaction});
            }
            if (FMheight?.length > 0) {
                const FMHeightArray = FMheight.split(",").map(Number);
                await FM.setHeights(FMHeightArray, {transaction});
            }
            if (FMsilhouette?.length > 0) {
                const FMsilhouetteArray = FMsilhouette.split(",").map(Number);
                await FM.setSilhouettes(FMsilhouetteArray, {transaction});
            }
            if (FMsmoker?.length > 0) {
                const FMsmokerArray = FMsmoker.split(",").map(Number);
                await FM.setSmokers(FMsmokerArray, {transaction});
            }
            if (FMtatoo?.length > 0) {
                const FMtatooArray = FMtatoo.split(",").map(Number);
                await FM.setTattoos(FMtatooArray, {transaction});
            }

            await transaction.commit();

            res.status(200).json({message: "Future Moitie updated successfully", FM});
        } catch (error) {
            if (!transaction.finished) {
                await transaction.rollback();
            }
            console.error("Error updating Future Moitie:", error);
            return res.status(500).json({message: error.message || "An unexpected error occurred."});
        }
    });
};

const {Op} = require("sequelize");

const deactivateProfileAide = async (req, res) => {
    const {aideId} = req.params;
    const {userId} = req.body; // Need userId to check remaining aides

    const transaction = await sequelize.transaction();

    try {
        let deleted = false;
        let gdprAideToDelete = null;
        let aidantId = null;

        const profileAide = await ProfileAide.findByPk(aideId, {transaction});

        if (profileAide) {
            aidantId = profileAide.aidant_id; //  Get aidant ID before deletion

            gdprAideToDelete = await GdprAide.findOne({
                where: {
                    profile_aide_id: aideId
                },
                transaction
            });

            await profileAide.destroy({transaction});
            deleted = true;
        } else {
            gdprAideToDelete = await GdprAide.findByPk(aideId, {transaction});
            
            if (gdprAideToDelete) {
                aidantId = gdprAideToDelete.aidant_id; // Get from GDPR if not in ProfileAide
            }
        }

        if (gdprAideToDelete) {
            await GdprConsentHistory.destroy({
                where: {
                    entity_id: gdprAideToDelete.id,
                },
                transaction,
            });

            await GdprConsent.destroy({
                where: {
                    entity_id: gdprAideToDelete.id,
                },
                transaction,
            });

            await gdprAideToDelete.destroy({transaction});
            deleted = true;
        }

        if (!deleted) {
            await transaction.rollback();
            return res.status(404).json({message: "Aide not found."});
        }

        //  CHECK IF USER HAS ANY REMAINING AIDES
        if (aidantId) {
            const remainingAides = await ProfileAide.count({
                where: { aidant_id: aidantId },
                transaction
            });

            console.log(`Aidant ${aidantId} has ${remainingAides} aides remaining`);

            //  IF NO AIDES LEFT, DELETE ALL CONVERSATIONS
            if (remainingAides === 0) {
                console.log(`No aides left for aidant ${aidantId}, deleting all conversations`);

                // Find all conversations where this aidant is a participant
                const userConversations = await Participant.findAll({
                    where: { aidant_id: aidantId },
                    attributes: ['conversation_id'],
                    transaction
                });

                const conversationIds = userConversations.map(cp => cp.conversation_id);

                if (conversationIds.length > 0) {
                    console.log(`Deleting ${conversationIds.length} conversations`);

                    const message = 
                    await Message.findAll({
                where: { conversation_id: { [Op.in]: conversationIds } },
                transaction
            });
            const messageIds = message.map(cp => cp.id);

                    // Delete message statuses first
                    await MessageStatus.destroy({
                        where: {
                            message_id: {
                                [Op.in]: messageIds
                            }
                        },
                        transaction
                    });

                    // Delete messages
                    await Message.destroy({
                        where: { conversation_id: { [Op.in]: conversationIds } },
                        transaction
                    });  
                    
       

                    // Delete participants
                    await Participant.destroy({
                        where: { conversation_id: { [Op.in]: conversationIds } },
                        transaction
                    });

                    // Delete conversations
                    await Conversation.destroy({
                        where: { id: { [Op.in]: conversationIds } },
                        transaction
                    });
                    

                    await transaction.commit();
                    return res.status(200).json({ 
                        message: "Dernier aidé(e) supprimé. Toutes les conversations ont été supprimées.",
                        deletedConversations: conversationIds.length,
                        remainingAides: 0
                    });
                }
            }
        }

        await transaction.commit();
        return res.status(200).json({
            message: "Aide deleted successfully.",
            remainingAides: aidantId ? await ProfileAide.count({ where: { aidant_id: aidantId } }) : 0
        });

    } catch (error) {
        if (transaction.finished !== "rollback") {
            await transaction.rollback();
        }
        console.error("Error deleting Aide:", error);
        return res.status(500).json({message: error.message || "An unexpected error occurred."});
    }
};


const suspendAideProfile = async (req, res) => {
    const {aideId} = req.params;

    const transaction = await sequelize.transaction();

    try {

        const profileAide = await ProfileAide.findByPk(aideId, {transaction});
        if (!profileAide) {
            await transaction.rollback();
            return res.status(404).json({message: "ProfileAide not found."});
        }

        await profileAide.update({is_suspended: !profileAide.is_suspended}, {transaction});
        await transaction.commit();

        res.status(200).json({message: "Aide suspended successfully."});
    } catch (error) {
        await transaction.rollback();
        console.error("Error deactivating ProfileAide:", error);
        return res.status(500).json({message: error.message});
    }
};

module.exports = {
    getAllProfileAides,
    getProfileAideById,
    getFutureMoitieById,
    createProfileAide,
    updateProfileAide,
    updateFutureMoitie,
    getAllAideByAidant,
    deactivateProfileAide,
    suspendAideProfile
};

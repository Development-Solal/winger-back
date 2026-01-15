const {
    ProfileAidant,
    ProfileAide,
    PaymentHistory,
    Subscription,
    Conversation,
    User,
    Role,
    ProfileTypeAidant,
    ProfileAidantPro
} = require('../models');
const models = require("../models"); // Sequelize models
const logger = require('../utils/logger');
const {fn, col, literal} = require("sequelize");
const fs = require('fs/promises');
const path = require('path');
const archiver = require('archiver');

// Helper function to capitalize first letter
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

const getStats = async (req, res) => {
    if (req.user.roleId != 1) {
        return res.status(403).json({message: 'Seuls les administrateurs peuvent accéder à cette API.'});
    }

    try {
        const [aidantCount, aideCount, totalCreditsResult, subscribedCount, conversationCount] = await Promise.all([
            ProfileAidant.count(),
            ProfileAide.count(),
            PaymentHistory.sum('credits', {
                where: {
                    subscription_type: 'forfait',
                    payment_status: 'success',
                },
            }),
            Subscription.count({
                where: {status: 'active'}
            }),
            Conversation.count(),
        ]);

        return res.status(200).json({
            aidantCount,
            aideCount,
            totalCreditsBought: totalCreditsResult || 0,
            subscribedCount,
            conversationCount,
        });
    } catch (error) {
        console.error("Admin stats error:", error);
        res.status(500).json({message: "Error getting admin data", error: error.message});
    }
};


const addListItem = async (req, res) => {
    if (req.user.roleId != 1) {
        return res.status(403).json({message: 'Seuls les administrateurs peuvent accéder à cette API.'});
    }

    try {
        const {listType} = req.params;
        const {title} = req.body;

        if (!title) {
            return res.status(400).json({message: "Un nom est requis."});
        }

        // Dynamic model access
        const modelName = `List${capitalize(listType)}`;
        const Model = models[modelName];

        if (!Model) {
            return res.status(400).json({message: `Type de liste invalide: '${listType}'`});
        }

        await Model.create({title});

        const allItems = await Model.findAll({order: [['id', 'ASC']]});
        return res.status(200).json(allItems);
    } catch (error) {
        console.error("Error adding list item:", error);
        return res.status(500).json({message: "Internal server error."});
    }
};

const updateListItem = async (req, res) => {
    if (req.user.roleId != 1) {
        return res.status(403).json({message: 'Seuls les administrateurs peuvent accéder à cette API.'});
    }

    try {
        const {listType, id} = req.params;
        const {title} = req.body;

        if (!title) {
            return res.status(400).json({message: "Un nom est requis."});
        }

        const modelName = `List${capitalize(listType)}`;
        const Model = models[modelName];

        if (!Model) {
            return res.status(400).json({message: `Type de liste invalide: '${listType}'`});
        }

        const item = await Model.findByPk(id);
        if (!item) {
            return res.status(404).json({message: `Item avec id ${id} n'existe pas.`});
        }

        await item.update({title});

        const allItems = await Model.findAll({order: [['id', 'ASC']]});
        return res.status(200).json(allItems);
    } catch (error) {
        console.error("Error updating list item:", error);
        return res.status(500).json({message: "Internal server error."});
    }
};

const getAllUsers = async (req, res) => {
    if (req.user.roleId != 1) {
        return res.status(403).json({message: 'Seuls les administrateurs peuvent accéder à cette API.'});
    }

    try {
        const users = await User.findAll({
            attributes: {
                include: [
                    [
                        literal(`(
          SELECT COUNT(*)
          FROM "ProfileAides" AS pa
          WHERE pa."aidant_id" = "User"."id"
        )`),
                        "aideCount"
                    ]
                ],
                exclude: ["password"] // optional, for cleaner data
            },
            include: [
                {model: Role, as: "role"},
                {
                    model: ProfileAidant,
                    attributes: {
                        include: [
                            "active",
                            "profile_type_id",
                            [
                                literal(`(
                SELECT "contract_signed"
                FROM "ProfileAidantPros" AS pap
                WHERE pap."aidant_id" = "ProfileAidant"."id"
                LIMIT 1
              )`),
                                "contract_signed"
                            ]
                        ]
                    },
                    include: [
                        {model: ProfileTypeAidant}
                    ],
                }
            ],
            order: [["createdAt", "DESC"]],
        });

        return res.status(200).json(users);
    } catch (err) {
        logger.error("Error getting all users", {error: err.message});
        return res.status(500).json({message: err.message});
    }
};

const deactivateUsers = async (req, res) => {
    if (req.user.roleId != 1) {
        return res.status(403).json({message: 'Seuls les administrateurs peuvent accéder à cette API.'});
    }

    try {
        const {id} = req.params;

        if (!id) {
            return res.status(400).json({message: "Un utilisateur est requis."});
        }

        const profile = await ProfileAidant.findOne({where: {user_id: id}});

        if (!profile) {
            return res.status(404).json({message: "Aucun profil trouvé pour cet utilisateur."});
        }

        // Toggle the active status
        await profile.update({active: !profile.active});

        // Also update all ProfileAide related to this user
        await ProfileAide.update(
            {active: profile.active},
            {where: {aidant_id: id}}
        );

        const message = profile.active
            ? "Utilisateur réactivé avec succès."
            : "Utilisateur désactivé avec succès.";

        return res.status(200).json({message});
    } catch (err) {
        logger.error('Error toggling user status', {error: err.message});
        return res.status(500).json({message: err.message});
    }
};

const updateUser = async (req, res) => {
    if (req.user.roleId != 1) {
        return res.status(403).json({message: 'Seuls les administrateurs peuvent accéder à cette API.'});
    }

    const {id} = req.params;
    const {first_name, last_name, credits, roleId} = req.body;

    try {
        // Update User table
        const user = await User.findByPk(id);
        if (!user) return res.status(404).json({message: 'User not found'});

        await user.update({first_name, last_name, credits, roleId});

        // Update ProfileAidant where user_id = id
        const profile = await ProfileAidant.findOne({where: {user_id: id}});
        if (profile) {
            await profile.update({first_name, last_name});
        }

        return res.json({message: 'Utilisateur mis a jour'});
    } catch (error) {
        console.error('Error updating names:', error);
        return res.status(500).json({message: 'Internal server error'});
    }

}

const getAllAides = async (req, res) => {
    if (req.user.roleId != 1) {
        return res.status(403).json({message: 'Seuls les administrateurs peuvent accéder à cette API.'});
    }

    try {
        const users = await ProfileAide.findAll({
            attributes: ["id", "name", "active", "createdAt"],
            include: [
                {
                    model: ProfileAidant,
                    attributes: ["id", "first_name", "last_name"],
                },
            ],
            order: [["aidant_id", "DESC"]],
        });

        return res.status(200).json(users);
    } catch (err) {
        logger.error("Error getting all aides", {error: err.message});
        return res.status(500).json({message: err.message});
    }
};

const deactivateAides = async (req, res) => {
    if (req.user.roleId != 1) {
        return res.status(403).json({message: 'Seuls les administrateurs peuvent accéder à cette API.'});
    }

    try {
        const {id} = req.params;

        if (!id) {
            return res.status(400).json({message: "Un aidé est requis."});
        }

        const profile = await ProfileAide.findOne({where: {id}});

        if (!profile) {
            return res.status(404).json({message: "Aucun profil trouvé pour cette aidé."});
        }

        // Toggle the active status instead of destroying
        await profile.update({active: !profile.active});

        const message = profile.active
            ? "Aidé réactivé avec succès."
            : "Aidé désactivé avec succès.";

        return res.status(200).json({message});
    } catch (err) {
        logger.error('Error toggling aide status', {error: err.message});
        return res.status(500).json({message: err.message});
    }
};

const updateAideAidant = async (req, res) => {
    if (req.user.roleId != 1) {
        return res.status(403).json({message: 'Seuls les administrateurs peuvent accéder à cette API.'});
    }

    try {
        const {aideId, newAidantId} = req.body;
        // Validate both IDs
        if (!aideId || !newAidantId) {
            return res.status(400).json({message: "Un aidant est requis"});
        }

        // Check if aide exists
        const aide = await ProfileAide.findByPk(aideId);
        if (!aide) {
            return res.status(404).json({message: "Aidé pas trouvé"});
        }

        // Check if aidant exists
        const aidant = await ProfileAidant.findByPk(newAidantId);
        if (!aidant) {
            return res.status(404).json({message: "Aidant pas trouvé."});
        }

        // Update aidant_id
        aide.aidant_id = newAidantId;
        aide.active = true
        await aide.save();

        return res.status(200).json({message: "Aide mis à jour avec succès."});
    } catch (err) {
        console.error("Error updating aidant for aide:", err);
        return res.status(500).json({message: "Internal server error."});
    }
};

const downloadInvoicesZip = async (req, res) => {
    if (req.user.roleId !== 1) {
        return res.status(403).json({message: "Seuls les administrateurs peuvent accéder à cette API."});
    }

    try {
        const {ids} = req.body;

        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({message: "Une liste d'identifiants de factures est requise."});
        }

        // Set headers for ZIP file response
        res.setHeader("Content-Type", "application/zip");
        res.setHeader("Content-Disposition", "attachment; filename=factures.zip");

        const archive = archiver("zip", {zlib: {level: 9}});
        archive.pipe(res);

        for (const id of ids) {
            const filePath = path.join(__dirname, "../../assets/invoice", `${id}.pdf`);
            const fileExists = await fs.access(filePath).then(() => true).catch(() => false);

            if (fileExists) {
                archive.file(filePath, {name: `${id}.pdf`});
            } else {
                logger.warn(`Fichier manquant: ${id}`);
            }
        }

        archive.finalize();
    } catch (err) {
        logger.error("Erreur lors de la génération de l'archive ZIP", {error: err.message});
        return res.status(500).json({message: "Erreur lors de la génération de l'archive ZIP."});
    }
};

module.exports = {
    getStats,
    addListItem,
    updateListItem,
    getAllUsers,
    deactivateUsers,
    updateUser,
    getAllAides,
    deactivateAides,
    updateAideAidant,
    downloadInvoicesZip
};

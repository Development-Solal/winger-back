const { Favorite, ProfileAidant, ProfileAidantPro, ProfileAide, ListTown, ListAge } = require("../models");

const addFavorite = async (req, res) => {
    try {
        const { aidant_id, aide_id, fav_aide_id } = req.body;


        if (!aidant_id || !aide_id || !fav_aide_id) {
            return res.status(400).json({ message: "aidant_id, aide_id and fav_aide_id are required." });
        }

        const aidant = await ProfileAidant.findOne({
            where: { id: aidant_id },
            attributes: ["profile_type_id"],
        });

        if (!aidant) {
            return res.status(404).json({ message: "Aidant not found." });
        }

        const existingFavorite = await Favorite.findOne({
            where: { aidant_id, aide_id, fav_aide_id },
        });

        if (existingFavorite) {
            // If exists, remove from favorites
            await existingFavorite.destroy();
            const favoriteAides = await Favorite.findAll({
                where: { aidant_id },
                attributes: ["aidant_id","aide_id","fav_aide_id"],
            });
            return res.status(200).json({ message: "Favoris supprimé avec succès", isFavorite: favoriteAides });
        } else {
            // Otherwise, add to favorites
            if (aidant.profile_type_id === 1) {
                const favoriteCount = await Favorite.count({ where: { aidant_id } });

                // if (favoriteCount >= 5) {
                //     return res.status(403).json({ message: "Les Aides Particuliers ne peuvent avoir que 3 favoris." });
                // }
            }

            const favorite = await Favorite.create({ aidant_id, aide_id, fav_aide_id });

            const favoriteAides = await Favorite.findAll({
                where: { aidant_id },
                attributes: ["aidant_id","aide_id","fav_aide_id"],
            });

            return res.status(201).json({ message: "Favoris ajouté avec succès", isFavorite: favoriteAides });
        }
    } catch (error) {
        res.status(500).json({ message: "Error adding favorite", error: error.message });
    }
};

const getFavorites = async (req, res) => {
    try {
        const { aidantId, aideId } = req.body;

        if (!aidantId || !aideId) {
            return res.status(400).json({ message: "aidant et aide sont obligatoires." });
        }

        // Find all favorite Aide profiles linked to the Aidant
        const favorites = await Favorite.findAll({
            where: { aidant_id: aidantId, aide_id:aideId },
            attributes: [],
            include: [
                {
                    model: ProfileAide,
                    as: "favAide",
                    attributes: ["id", "profile_pic", "name"],
                    include: [
                        {
                            model: ProfileAidant,
                            as: "ProfileAidant",
                            attributes: ["id","profile_pic", "profile_type_id", "first_name", "last_name", "online", "createdAt"],
                            include: [
                                {   model: ListTown, as: "town"},
                                { model: ListAge, as: "age" },
                            ],
                        },
                        { model: ListAge, as: "age" },
                        { model: ListTown, as: "town" },
                    ],
                    order: [[{ model: ProfileAidant, as: "ProfileAidant" }, "first_name", "ASC"]], // Sort by first_name
                },
            ],
        });

        for (const profile of favorites) {
            if (profile.favAide.ProfileAidant && profile.favAide.ProfileAidant.profile_type_id === 2) {
                const aidantPro = await ProfileAidantPro.findOne({
                    where: { aidant_id: profile.favAide.ProfileAidant.id },
                    attributes: ["company_name", "company_description"],
                });
        
                // Attach aidantPro data to profile
                if (aidantPro) {
                    profile.favAide.dataValues.aidantPro = aidantPro;
                }
            }
        }

        const favoriteAides = await Favorite.findAll({
            where: { aidant_id: aidantId },
            attributes: ["aidant_id","aide_id","fav_aide_id"],
        });

        // Transform the response to match your search API format
        const formattedFavorites = favorites.map((fav) => ({
            ...fav.favAide.toJSON(),
            isFavorite: favoriteAides 
        }));

        if (!formattedFavorites.length) {
            return res.status(404).json({ message: "No favorites found for this Aidant." });
        }

        res.status(200).json(formattedFavorites);

    } catch (error) {
        res.status(500).json({ message: "Error retrieving favorites", error: error.message });
    }
};


module.exports = { addFavorite, getFavorites };

const {
  ProfileAide,
  ProfileAidantPro,
  Favorite,
  FutureMoitie,
  ProfileAidant,
  ListAge,
  ListRegion,
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
  sequelize,
} = require("../models");

const { Op } = require("sequelize");
const logger = require("../utils/logger");

//where clause for gdpr

// only show proffil where aidant has accepted all required consents

const getGdprConsentWhereClause = () => {
  return {
    all_required_accepted: true,
    active: true,
    aidant_deactivated:false
  };
};

const searchAll = async (req, res) => {
  try {
    const userId = req.body.userId;

    // Get the date 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    let departmentCodes = [];
    let communeInclude = null;
    let excludeAideIds = [];
    let favoriteAideIds = [];

    if (userId) {
      const aidant = await ProfileAidant.findOne({
        where: { user_id: userId },
        attributes: ["id", "commune_id"],
        include: [
          {
            model: ListCommune,
            attributes: ["code_postal"],
            as: "commune",
          },
        ],
      });

      if (aidant) {
        const postalCode = aidant.commune.code_postal.substring(0, 2);
        const regions = await ListRegion.findAll();

        const region = regions.find((region) =>
          region.departement_code
            .split(",")
            .map((dep) => dep.trim())
            .includes(postalCode)
        );

        if (region) {
          departmentCodes = region.departement_code.split(",").map((s) => s.trim());
          communeInclude = departmentCodes?.length
            ? {
                model: ListCommune,
                as: "commune",
                where: {
                  [Op.or]: departmentCodes.map((code) => ({
                    code_postal: { [Op.like]: `${code}%` },
                  })),
                },
              }
            : null;
        }

        // Find all Aide IDs linked to the current Aidant
        const linkedAides = await ProfileAide.findAll({
          where: { aidant_id: aidant.id},
          attributes: ["id"],
        });

        console.log("linkedAides", linkedAides);
        excludeAideIds = linkedAides.map((aide) => aide.id);

        const favoriteAides = await Favorite.findAll({
          where: { aidant_id: aidant.id },
          attributes: ["aidant_id", "aide_id", "fav_aide_id"],
        });
        favoriteAideIds = favoriteAides;
        // favoriteAideIds = favoriteAides.map((fav) => fav.fav_aide_id);
      }
    }

    const profiles = await ProfileAide.findAll({
      attributes: ["id", "profile_pic", "name" ,"aidant_is_aide"],
      where: { id: { [Op.notIn]: excludeAideIds }, createdAt: { [Op.gte]: thirtyDaysAgo },active: true, aidant_deactivated:false, is_suspended:false },
      include: [
        {
          model: ProfileAidant,
          as: "ProfileAidant",
          attributes: [
            "id",
            "profile_pic",
            "profile_type_id",
            "first_name",
            "last_name",
            "online",
            "createdAt",
            "last_seen_at",
          ],

          include: [
            { model: ListTown, as: "town" },
            { model: ListAge, as: "age" },
            // ...(communeInclude ? [communeInclude] : [])
          ],
        },
        { model: ListAge, as: "age" },
        { model: ListTown, as: "town" },
        { model: ListCommune, as: "commune" },
      ],
      order: [[{ model: ProfileAidant, as: "ProfileAidant" }, "first_name", "ASC"]], // Sort by first_name
    });

    if (profiles.length > 0) {
      for (const profile of profiles) {
        const now = new Date();
        const seenAt = new Date(profile.ProfileAidant.last_seen_at);
        const diffHours = (now - seenAt) / (1000 * 60 * 60);
        if (diffHours > 4) {
          profile.ProfileAidant.online = false;
          await profile.ProfileAidant.update({ online: false });
        }

        if (profile.ProfileAidant && profile.ProfileAidant.profile_type_id === 2) {
          const aidantPro = await ProfileAidantPro.findOne({
            where: { aidant_id: profile.ProfileAidant.id },
            attributes: ["company_name", "company_description"],
          });

          // Attach aidantPro data to profile
          if (aidantPro) {
            profile.dataValues.aidantPro = aidantPro;
          }
        }
      }

      const response = profiles.map((profile) => ({
        ...profile.toJSON(),
        isFavorite: userId ? favoriteAideIds : [],
      }));

      res.json(response);
    } else {
      res.status(404).json({ message: "No Aidant found" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const searchByProfileNumber = async (req, res) => {
  const { refNumber, userId } = req.body;

  if (!refNumber) {
    return res.status(400).json({ error: "Reference number is required" });
  }

  try {
    let favoriteAideIds = [];

    const aidant = await ProfileAidant.findOne({
      where: { profile_number: refNumber },
    });

    if (!aidant) {
      return res.status(400).json({ error: "No Aidant found" });
    }

    if (userId) {
      const favoriteAides = await Favorite.findAll({
        where: { aidant_id: userId },
        attributes: ["aidant_id", "aide_id", "fav_aide_id"],
      });
      // favoriteAideIds = favoriteAides.map((fav) => fav.fav_aide_id);
      favoriteAideIds = favoriteAides;
    }

    const profiles = await ProfileAide.findAll({
      where: { aidant_id: aidant.id, active: true },
      attributes: ["id", "profile_pic", "name" ,"aidant_is_aide"],
      include: [
        {
          model: ProfileAidant,
          as: "ProfileAidant",
          attributes: ["profile_pic", "profile_type_id", "first_name", "last_name", "online", "createdAt"],
          where: {
            // active: true,
            // userId: getGdprConsentWhereClause(),
            ...getGdprConsentWhereClause(),
          },
          include: [
            { model: ListTown, as: "town" },
            { model: ListAge, as: "age" },
          ],
        },
        { model: ListAge, as: "age" },
        { model: ListTown, as: "town" },
      ],
      order: [[{ model: ProfileAidant, as: "ProfileAidant" }, "first_name", "ASC"]], // Sort by first_name
    });

    // If Aidant is found and profile_type_id is 2, include AidantPro
    if (profiles) {
      if (aidant.profile_type_id === 2) {
        const aidantPro = await ProfileAidantPro.findOne({
          where: { aidant_id: aidant.id },
          attributes: ["company_name", "company_description"],
        });
        profiles.forEach((profile) => {
          profile.dataValues.aidantPro = aidantPro;
        });
      }

      if (userId) {
        const response = profiles.map((profile) => ({
          ...profile.toJSON(),
          isFavorite: userId ? favoriteAideIds : [],
        }));

        res.json(response);
      } else {
        res.json(profiles);
      }
    } else {
      res.status(404).json({ message: "No Aidant found" });
    }
  } catch (error) {
    res.status(500).json({ message: "Error searching Aidant", error: error.message });
  }
};

const searchByFilter = async (req, res) => {
  try {
    const { filters, userId, aideId } = req.body;

    const whereClause = {};
    const whereClauseAidant = {};
    let excludeAideIds = [];
    let favoriteAideIds = [];

    if (filters.type === "pro") {
      whereClauseAidant.profile_type_id = 2;
    }

    if (filters.type === "par") {
      whereClauseAidant.profile_type_id = 1;
    }

    if (filters.gender) {
      whereClause.gender = filters.gender;
    }

    if (filters.age && filters.age.length > 0) {
      whereClause.age_id = { [Op.in]: filters.age };
    }

    if (filters.townOption && filters.townOption.length > 0) {
      let townConditions = [];

      if (filters.townOption.includes("3")) {
        const aide = await ProfileAide.findOne({
          where: { id: aideId },
          attributes: ["town_id"],
        });

        if (aide && aide.town_id) {
          const town = await ListTown.findOne({
            where: { id: aide.town_id },
            attributes: ["Code"],
          });

          if (town && town.Code) {
            const deptCode = town.Code;
            const regions = await ListRegion.findAll();
            const region = regions.find((r) =>
              r.departement_code
                .split(",")
                .map((code) => code.trim())
                .includes(deptCode)
            );

            if (region) {
              const deptCodes = region.departement_code.split(",").map((code) => code.trim());

              const townsInRegion = await ListTown.findAll({
                where: {
                  [Op.or]: deptCodes.map((code) => ({
                    Code: { [Op.like]: `${code}%` },
                  })),
                },
                attributes: ["id"],
              });

              const townsIds = townsInRegion.map((c) => c.id);
              townConditions.push({ town_id: { [Op.in]: townsIds } });
            }
          }
        }
      } else if (filters.townOption.includes("2")) {
        const aide = await ProfileAide.findOne({
          where: { id: aideId },
          attributes: ["town_id"],
        });

        if (aide && aide.town_id) {
          const town = await ListTown.findOne({
            where: { id: aide.town_id },
            attributes: ["Code"],
          });

          if (town && town.Code) {
            const deptCode = town.Code;

            const townsInSameDept = await ListTown.findAll({
              where: {
                Code: {
                  [Op.like]: `${deptCode}%`,
                },
              },
              attributes: ["id"],
            });

            const townIds = townsInSameDept.map((c) => c.id);
            townConditions.push({ town_id: { [Op.in]: townIds } });
          }
        }
      } else if (filters.townOption.includes("1")) {
        const aide = await ProfileAide.findOne({
          where: { id: aideId },
          attributes: ["town_id"],
        });

        if (aide && aide.town_id) {
          townConditions.push({ town_id: aide.town_id });
        }
      } else {
        townConditions = [];
      }
      whereClause[Op.and] = townConditions;
    }

    if (filters.town && filters.town.length > 0) {
      whereClause.town_id = { [Op.in]: filters.town };
    }

    if (filters.origine && filters.origine.length > 0) {
      whereClause.origine_id = { [Op.or]: [{ [Op.in]: filters.origine }, null] };
    }

    if (filters.nationality && filters.nationality.length > 0) {
      whereClause.nationality_id = { [Op.or]: [{ [Op.in]: filters.nationality }, null] };
    }

    // if (filters.language && filters.language.length > 0) {
    //     whereClause.language_id = { [Op.in]: filters.language };
    // }

    if (filters.religion && filters.religion.length > 0) {
      whereClause.religion_id = { [Op.or]: [{ [Op.in]: filters.religion }, null] };
    }

    if (filters.education && filters.education.length > 0) {
      whereClause.education_id = {
        [Op.or]: [{ [Op.in]: filters.education }, null],
      };
    }

    if (filters.height && filters.height.length > 0) {
      whereClause.height_id = { [Op.or]: [{ [Op.in]: filters.height }, null] };
    }

    if (filters.silhouette && filters.silhouette.length > 0) {
      whereClause.silhouette_id = { [Op.or]: [{ [Op.in]: filters.silhouette }, null] };
    }

    if (filters.smoker && filters.smoker.length > 0) {
      whereClause.smoker_id = { [Op.or]: [{ [Op.in]: filters.smoker }, null] };
    }

    if (filters.tattoo && filters.tattoo.length > 0) {
      whereClause.tattoo_id = { [Op.or]: [{ [Op.in]: filters.tattoo }, null] };
    }

    if (userId) {
      const aidant = await ProfileAidant.findOne({
        where: { user_id: userId },
        attributes: ["id"],
      });

      if (aidant) {
        const linkedAides = await ProfileAide.findAll({
          where: { aidant_id: aidant.id},
          attributes: ["id"],
        });

        excludeAideIds = linkedAides.map((aide) => aide.id);

        const favoriteAides = await Favorite.findAll({
          where: { aidant_id: aidant.id },
          attributes: ["aidant_id", "aide_id", "fav_aide_id"],
        });
        favoriteAideIds = favoriteAides;
        // favoriteAideIds = favoriteAides.map((fav) => fav.fav_aide_id);
      }
    }

    const includeOptions = [
      {
        model: ProfileAidant,
        where: {
          ...whereClauseAidant,
          //   active: true,
          //   userId: getGdprConsentWhereClause(),
          ...getGdprConsentWhereClause(),
        },
        as: "ProfileAidant",
        attributes: ["id", "profile_pic", "profile_type_id", "first_name", "last_name", "online", "createdAt"],
        include: [
          { model: ListTown, as: "town" },
          { model: ListAge, as: "age" },
        ],
      },
      { model: ListAge, as: "age" },
      { model: ListTown, as: "town" },
    ];

    if (filters.passion && filters.passion.length > 0) {
      includeOptions.push({
        model: ListPassion,
        as: "passions",
        attributes: ["id", "title"],
        through: { attributes: [] },
        required: true,
        where: {
          id: { [Op.in]: filters.passion },
        },
      });
    }

    if (filters.language && filters.language.length > 0) {
      includeOptions.push({
        model: ListLanguage,
        as: "language",
        attributes: ["id", "title"],
        through: { attributes: [] },
        required: true,
        where: {
          id: { [Op.in]: filters.language },
        },
      });
    }

    if (filters.kids && filters.kids.length > 0) {
      includeOptions.push({
        model: ListKid,
        as: "kids",
        attributes: ["id", "title"],
        through: { attributes: [] },
        required: true,
        where: {
          id: { [Op.in]: filters.kids },
        },
      });
    }

    const profiles = await ProfileAide.findAll({

      where: {
        ...whereClause,
        is_suspended:false,
        id: { [Op.notIn]: excludeAideIds }, // Exclude Aides linked to current Aidant
        active: true,
      },
      attributes: ["id", "profile_pic", "name", "aidant_is_aide"],
      include: includeOptions,
      order: [[{ model: ProfileAidant, as: "ProfileAidant" }, "first_name", "ASC"]],
    });

    for (const profile of profiles) {
      if (profile.ProfileAidant && profile.ProfileAidant.profile_type_id === 2) {
        const aidantPro = await ProfileAidantPro.findOne({
          where: { aidant_id: profile.ProfileAidant.id },
          attributes: ["company_name", "company_description"],
        });

        // Attach aidantPro data to profile
        if (aidantPro) {
          profile.dataValues.aidantPro = aidantPro;
        }
      }
    }

    const response = profiles.map((profile) => ({
      ...profile.toJSON(),
      isFavorite: userId ? favoriteAideIds : [],
    }));

    res.json(response);
  } catch (error) {
    res.status(500).json({ message: "Error filtering profiles", error: error.message });
  }
};

// Recherche des aidés dont les critères Ma futur moitié correspondent à Mes Informations en tant qu’Aidé
// Ramener les aidés dont Mes informations ci-dessous sont identiques aux critères « Ma futur Moitié » de chaque aidé :
const searchAideByFM = async (req, res) => {
  try {
    const { aideId } = req.params;
    const { userId } = req.body;

    // Step 1: Get criteria from FutureMoitie of the selected Aide
    const futureMoitie = await FutureMoitie.findOne({
      where: { aide_id: aideId },
      attributes: ["gender"],
      include: [
        { model: ListAge, as: "ages", attributes: ["id"], through: { attributes: [] } },
        { model: ListTownOption, as: "townOptions", attributes: ["id"], through: { attributes: [] } },
        {
          model: ProfileAide,
          as: "aide",
          attributes: ["gender", "commune_id", "town_id"],
          include: [
            {
              model: ListTown,
              as: "town",
              attributes: ["Code"],
            },
            { model: ListAge, as: "age" },
          ],
        },
      ],
    });

    if (!futureMoitie) return res.status(404).json({ message: "Future Moitié criteria not found." });

    const { gender, ages, townOptions, aide } = futureMoitie;
    const ageIds = ages.map((a) => a.id);
    const townOptionIds = townOptions.map((t) => t.id);
    const townConditions = [];

    if (aide && aide.town && aide.town.Code) {
      const { town_id } = aide;
      // const postalCode = aide.commune.code_postal;
      const townCode = aide.town.Code;
      const deptCode = townCode;

      if (townOptionIds.includes(1)) townConditions.push({ town_id: town_id }); // Same town

      if (townOptionIds.includes(2)) {
        // Same department

        const towns = await ListTown.findAll({
          where: {
            Code: { [Op.like]: `${deptCode}%` },
          },
          attributes: ["id"],
        });
        townConditions.push({ town_id: { [Op.in]: towns.map((t) => t.id) } });
      }

      if (townOptionIds.includes(3)) {
        // Same region
        const regions = await ListRegion.findAll();
        const region = regions.find((r) =>
          r.departement_code
            .split(",")
            .map((c) => c.trim())
            .includes(deptCode)
        );
        if (region) {
          const deptCodes = region.departement_code.split(",").map((c) => c.trim());

          const towns = await ListTown.findAll({
            where: {
              [Op.or]: deptCodes.map((code) => ({
                Code: { [Op.like]: `${code}%` },
              })),
            },
            attributes: ["id"],
          });
          townConditions.push({ town_id: { [Op.in]: towns.map((t) => t.id) } });
        }
      }

      // 4 = all France, 5 = worldwide => ignore town filtering
      if (townOptionIds.includes(4) || townOptionIds.includes(5)) {
        townConditions.length = 0; // override any previous town conditions
      }
    }

    // Step 2: Exclude Aides already linked to current Aidant
    let excludeAideIds = [],
      favoriteAideIds = [];

    if (userId) {
      const aidant = await ProfileAidant.findOne({ where: { user_id: userId }, attributes: ["id"] });
      if (aidant) {
        const linkedAides = await ProfileAide.findAll({ where: { aidant_id: aidant.id }, attributes: ["id"] });
        excludeAideIds = linkedAides.map((a) => a.id);

        const favorites = await Favorite.findAll({
          where: { aidant_id: aidant.id },
          attributes: ["aidant_id", "aide_id", "fav_aide_id"],
        });
        // favoriteAideIds = favorites.map(fav => fav.fav_aide_id);
        favoriteAideIds = favorites;
      }
    }

    // Step 3: Find Aides whose Future Moitié matches the above criteria
    const matchedAides = await ProfileAide.findAll({
      where: {
        id: { [Op.notIn]: excludeAideIds },
        active: true,
        aidant_deactivated: false
      },
      include: [
        {
          model: FutureMoitie,
          as: "futureMoitie",
          required: true,
          where: {
            gender: aide.gender,
          },
          include: [
            {
              model: ListAge,
              as: "ages",
              where: { id: { [Op.in]: [aide.age.id] } },
              through: { attributes: [] },
            },
            {
              model: ListTownOption,
              as: "townOptions",
              through: { attributes: [] },
            },
          ],
        },
        {
          model: ProfileAidant,
          as: "ProfileAidant",
          //   where: { active: true },
          //   userId: getGdprConsentWhereClause(),
          where: {
            // ADD THIS LINE
            ...getGdprConsentWhereClause(),
          },
          attributes: ["id", "profile_pic", "profile_type_id", "first_name", "last_name", "online", "createdAt"],
          include: [
            { model: ListTown, as: "town" },
            { model: ListAge, as: "age" },
          ],
        },
        { model: ListAge, as: "age" },
        { model: ListTown, as: "town" },
      ],
    });

    // Step 4: Filter by townConditions if needed
    let filtered = matchedAides;

    if (townConditions.length > 0) {
      filtered = matchedAides.filter((a) =>
        townConditions.some((cond) => {
          if (cond.town_id) {
            if (Array.isArray(cond.town_id[Op.in])) {
              return cond.town_id[Op.in].includes(a.town_id);
            }
            return a.town_id === cond.town_id;
          }
          return false;
        })
      );
    }

    // Step 5: Attach Aidant Pro info and Favorite status
    for (const profile of filtered) {
      if (profile.ProfileAidant?.profile_type_id === 2) {
        const aidantPro = await ProfileAidantPro.findOne({
          where: { aidant_id: profile.ProfileAidant.id },
          attributes: ["company_name", "company_description"],
        });
        if (aidantPro) profile.dataValues.aidantPro = aidantPro;
      }
    }

    const response = filtered.map((p) => ({
      ...p.toJSON(),
      isFavorite: userId ? favoriteAideIds : [],
    }));

    res.json(response);
  } catch (error) {
    console.error("Error searching by Future Moitié:", error);
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};

// Recherche par les critères Ma futur Moitié – IL/ELLE est mon idéal
// Ramener les aidés dont MES critères « Ma future Moitié » ci-dessous sont identiques aux critères des Aidés dans la base :
const searchFMbyAide = async (req, res) => {
  try {
    const { aideId } = req.params;
    const { userId } = req.body;

    const aide = await ProfileAide.findOne({
      where: { id: aideId },
      include: {
        model: ListTown,
        as: "town",
        attributes: ["Code"],
      },
    });

    if (!aide) {
      return res.status(404).json({ message: "Aide not found." });
    }

    const { town } = aide;
    const postalCode = town.Code;

    // Get FM criteria of this aide
    const FMofAide = await FutureMoitie.findOne({
      where: { aide_id: aideId },
      include: [
        {
          model: ListAge,
          as: "ages",
          attributes: ["id"],
          through: { attributes: [] },
        },
        {
          model: ListTownOption,
          as: "townOptions",
          attributes: ["id"],
          through: { attributes: [] },
        },
      ],
    });

    if (!FMofAide) {
      return res.status(404).json({ message: "Future Moitié not found for this aide." });
    }

    const fmGender = FMofAide.gender;
    const allowedAgeIds = FMofAide.ages.map((age) => age.id);
    const townOptions = FMofAide.townOptions.map((opt) => opt.id);

    let townConditions = [];

    // Build town conditions based on selected options
    if (townOptions.includes(1)) {
      // Dans ma ville
      townConditions.push({ town_id: aide.town_id });
    }

    if (townOptions.includes(2)) {
      const townsWithSamePostal = await ListTown.findAll({
        where: {
          Code: {
            [Op.like]: `${postalCode}%`, // Match all communes starting with dept code
          },
        },
        attributes: ["id"],
      });
      const ids = townsWithSamePostal.map((c) => c.id);
      townConditions.push({ town_id: { [Op.in]: ids } });
    }

    if (townOptions.includes(3)) {
      const allRegions = await ListRegion.findAll();
      const region = allRegions.find((r) =>
        r.departement_code
          .split(",")
          .map((d) => d.trim())
          .includes(postalCode)
      );

      if (region) {
        const deptList = region.departement_code.split(",").map((d) => d.trim());

        const townsInRegion = await ListTown.findAll({
          where: {
            [Op.or]: deptList.map((code) => ({
              Code: { [Op.like]: `${code}%` },
            })),
          },
          attributes: ["id"],
        });

        const ids = townsInRegion.map((c) => c.id);
        townConditions.push({ town_id: { [Op.in]: ids } });
      }
    }

    // If "France entière" or "Monde entier" is selected, ignore town filters
    if (townOptions.includes(4) || townOptions.includes(5)) {
      townConditions = [];
    }

    // Exclude already linked or favorite Aides (if aidant is logged in)
    let excludeAideIds = [];
    let favoriteAideIds = [];

    if (userId) {
      const aidant = await ProfileAidant.findOne({
        where: { user_id: userId },
        attributes: ["id"],
      });

      if (aidant) {
        const linkedAides = await ProfileAide.findAll({
          where: { aidant_id: aidant.id },
          attributes: ["id"],
        });
        excludeAideIds = linkedAides.map((a) => a.id);

        const favorites = await Favorite.findAll({
          where: { aidant_id: aidant.id },
          attributes: ["aidant_id", "aide_id", "fav_aide_id"],
        });
        // favoriteAideIds = favorites.map((f) => f.fav_aide_id);
        favoriteAideIds = favorites;
      }
    }

    // Build main query
    const whereClause = {
      gender: fmGender,
      age_id: { [Op.in]: allowedAgeIds },
      id: { [Op.notIn]: excludeAideIds },
      active: true,
    };

    if (townConditions.length > 0) {
      whereClause[Op.or] = townConditions;
    }

    const profiles = await ProfileAide.findAll({
      where: whereClause,
      attributes: ["id", "profile_pic", "name" ,"aidant_is_aide"],
      include: [
        {
          model: ProfileAidant,
          as: "ProfileAidant",
          attributes: ["id", "profile_pic", "profile_type_id", "first_name", "last_name", "online", "createdAt"],
          //   where: { active: true },
          //   userId: getGdprConsentWhereClause(),
          where: {
            ...getGdprConsentWhereClause(),
          },
          include: [
            { model: ListTown, as: "town" },
            { model: ListAge, as: "age" },
          ],
        },
        { model: ListAge, as: "age" },
        { model: ListTown, as: "town" },
      ],
      order: [[{ model: ProfileAidant, as: "ProfileAidant" }, "first_name", "ASC"]],
    });

    // Attach extra pro info if professional
    for (const profile of profiles) {
      if (profile.ProfileAidant?.profile_type_id === 2) {
        const aidantPro = await ProfileAidantPro.findOne({
          where: { aidant_id: profile.ProfileAidant.id },
          attributes: ["company_name", "company_description"],
        });
        if (aidantPro) {
          profile.dataValues.aidantPro = aidantPro;
        }
      }
    }

    const response = profiles.map((profile) => ({
      ...profile.toJSON(),
      isFavorite: userId ? favoriteAideIds : [],
    }));

    res.json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching aides matching FM criteria", error: error.message });
  }
};

const getFiche = async (req, res) => {
  try {
    const decodedAideId = atob(req.params.encodedAideId);
    const decodedUserId = atob(req.body.encodedUserId);

    const [profile, favoriteAides] = await Promise.all([
      ProfileAide.findOne({
        where: { id: decodedAideId },
        attributes: ["id", "profile_number", "profile_pic", "name", "gender", "aidant_relation", "description" , "aidant_is_aide"],
        include: [
          { model: ListAge, as: "age", attributes: ["title"] },
          { model: ListTown, as: "town", attributes: ["town"] },
          { model: ListOrigine, as: "origine", attributes: ["title"] },
          { model: ListNationality, as: "nationality", attributes: ["title"] },
          { model: ListReligion, as: "religion", attributes: ["title"] },
          { model: ListEducation, as: "education", attributes: ["title"] },
          { model: ListHeight, as: "height", attributes: ["title"] },
          { model: ListSilhouette, as: "silhouette", attributes: ["title"] },
          { model: ListSmoker, as: "smoker", attributes: ["title"] },
          { model: ListTattoo, as: "tattoo", attributes: ["title"] },
          { model: ListKid, as: "kids", attributes: ["title"], through: { attributes: [] } },
          { model: ListPassion, as: "passions", attributes: ["title"], through: { attributes: [] } },
          { model: ListLanguage, as: "language", attributes: ["title"], through: { attributes: [] } },
          {
            model: ProfileAidant,
            attributes: [
              "id",
              "profile_number",
              "profile_pic",
              "profile_type_id",
              "first_name",
              "online"
            ],
            include: [
              { model: ListTown, as: "town", attributes: ["town"] },
              { model: ListAge, as: "age", attributes: ["title"] },
            ],
          },
        ],
      }),
      Favorite.findAll({
        where: { aidant_id: decodedUserId },
        attributes: ["aidant_id", "aide_id", "fav_aide_id"],
      }),
    ]);

    if (!profile) return res.status(404).json({ message: "Profile not found" });

    if (profile.ProfileAidant?.profile_type_id === 2) {
      const aidantPro = await ProfileAidantPro.findOne({
        where: { aidant_id: profile.ProfileAidant.id },
        attributes: ["company_id", "company_name", "company_description"],
      });

      if (aidantPro) {
        profile.dataValues.aidantPro = aidantPro;
      }
    }

    return res.json({
      ...profile.toJSON(),
      isFavorite: favoriteAides,
    });
  } catch (error) {
    return res.status(400).json({ message: "Error getting Aide", error: error.message });
  }
};

const getFicheFutureMoitie = async (req, res) => {
  try {
    const decodedAideId = atob(req.params.encodedAideId);

    const futureMoitie = await FutureMoitie.findOne({
      where: { aide_id: decodedAideId },
      attributes: ["gender", "description"],
      include: [
        { model: ListOrigine, as: "origines", through: { attributes: [] } },
        { model: ListKid, as: "kids", through: { attributes: [] } },
        { model: ListNationality, as: "nationalities", through: { attributes: [] } },
        { model: ListAge, as: "ages", through: { attributes: [] } },
        { model: ListTownOption, as: "townOptions", through: { attributes: [] } },
        { model: ListPassion, as: "passions", through: { attributes: [] } },
        { model: ListReligion, as: "religions", through: { attributes: [] } },
        { model: ListLanguage, as: "languages", through: { attributes: [] } },
        { model: ListEducation, as: "educations", through: { attributes: [] } },
        { model: ListHeight, as: "heights", through: { attributes: [] } },
        { model: ListSilhouette, as: "silhouettes", through: { attributes: [] } },
        { model: ListSmoker, as: "smokers", through: { attributes: [] } },
        { model: ListTattoo, as: "tattoos", through: { attributes: [] } },
      ],
      order: [
        [{ model: ListAge, as: "ages" }, "id", "ASC"],
        [{ model: ListTownOption, as: "townOptions" }, "id", "DESC"],
        [{ model: ListEducation, as: "educations" }, "id", "ASC"],
        [{ model: ListHeight, as: "heights" }, "id", "ASC"],
      ],
    });

    if (!futureMoitie) {
      return res.status(404).json({ message: "Future Moitié not found" });
    }

    return res.json(futureMoitie);
  } catch (error) {
    return res.status(400).json({ message: "Error getting Future Moitie", error: error.message });
  }
};

const getAllAideByAidant = async (req, res) => {
  const decodedAidantId = atob(req.params.encodedAidantId);
  const { encodedUserId, encodedAideId } = req.body;
  const decodedUserId = atob(encodedUserId);
  const decodedAideId = atob(encodedAideId);

  let favoriteAideIds = [];

  try {
    const profiles = await ProfileAide.findAll({
      where: { aidant_id: decodedAidantId, id: { [Op.ne]: decodedAideId } },
      attributes: ["id", "profile_pic", "name","aidant_is_aide"],
      include: [
        {
          model: ProfileAidant,
          as: "ProfileAidant",
          attributes: ["id", "profile_pic", "profile_type_id", "first_name", "last_name", "online", "createdAt"],
          where: {
            // active: true,
            // userId: getGdprConsentWhereClause(),
            ...getGdprConsentWhereClause(),
          },
          include: [
            { model: ListAge, as: "age", attributes: ["title"] },
            { model: ListTown, as: "town", attributes: ["town"] },
          ],
        },
        { model: ListAge, as: "age", attributes: ["title"] },
        { model: ListTown, as: "town", attributes: ["town"] },
      ],
      order: [[{ model: ProfileAidant, as: "ProfileAidant" }, "first_name", "ASC"]],
    });

    const favoriteAides = await Favorite.findAll({
      where: { aidant_id: decodedUserId },
      attributes: ["aidant_id", "aide_id", "fav_aide_id"],
    });

    // favoriteAideIds = favoriteAides.map((fav) => fav.fav_aide_id);
    favoriteAideIds = favoriteAides;

    for (const profile of profiles) {
      if (profile.ProfileAidant && profile.ProfileAidant.profile_type_id === 2) {
        const aidantPro = await ProfileAidantPro.findOne({
          where: { aidant_id: profile.ProfileAidant.id },
          attributes: ["company_name", "company_description"],
        });

        // Attach aidantPro data to profile
        if (aidantPro) {
          profile.dataValues.aidantPro = aidantPro;
        }
      }
    }

    const response = profiles.map((profile) => ({
      ...profile.toJSON(),
      isFavorite: favoriteAideIds,
    }));

    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  searchByProfileNumber,
  searchByFilter,
  searchAll,
  searchAideByFM,
  searchFMbyAide,
  getFiche,
  getFicheFutureMoitie,
  getAllAideByAidant,
};

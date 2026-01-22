const { sequelize, ListLanguage, ListNationality, ListTown, ListCommune, ListAge, ListEducation, ListHeight, ListKid, ListOrigine, ListPassion, ListReligion, ListSilhouette, ListSmoker, ListTattoo, ListTownOption, ListRegion } = require('../models');
const axios = require('axios');
const { Sequelize } = require('sequelize'); // Add this line
const path = require("path");
const XLSX = require("xlsx");

const filePathTown = path.join(__dirname, "..", "assets", "ListTowns.xlsx");
const filePathLanguage = path.join(__dirname, "..", "assets", "ListLanguage.xlsx");
const filePathNationality = path.join(__dirname, "..", "assets", "ListNationality.xlsx");
const filePathRegion = path.join(__dirname, "..", "assets", "ListRegion.xlsx");

const updateTownCodesFromXlsx = async (req, res) => {
  try {
    const workbook = XLSX.readFile(filePathTown);
    const sheetName = workbook.SheetNames[0];
    const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    let updatedCount = 0;

    for (const row of jsonData) {
      const townName = row["Département"]?.trim();
      const code = row["Code"]?.toString().trim();

      if (townName && code) {
        const [affectedRows] = await ListTown.update(
          { Code: code },
          { where: { town: townName } }
        );

        if (affectedRows > 0) {
          updatedCount++;
        }
      }
    }

    console.log(`Codes backfilled for ${updatedCount} towns.`);
    return res.status(200).json({
      message: `Codes backfilled successfully!`,
      updated: updatedCount,
    });
  } catch (error) {
    console.error("Error backfilling codes:", error);
    return res.status(500).json({ error: "Failed to backfill town codes" });
  }
};


const importTownsFromXlsx = async (req, res) => {
  try {
    // Read the Excel file
    const workbook = XLSX.readFile(filePathTown);
    const sheetName = workbook.SheetNames[0]; // Read the first sheet
    const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]); // Convert to JSON

    // Map data to match your DB structure
    const towns = jsonData.map(row => ({
      town: row["Département"]?.trim(), // Ensure correct column names
    }));

    // Bulk insert into database
    if (towns.length > 0) {
      await ListTown.bulkCreate(towns, {
        ignoreDuplicates: true
      });
      console.log("XLSX data imported successfully!");
      return res.status(200).json({ message: "XLSX data imported successfully!", inserted: towns.length });
    } else {
      console.log("No valid data found in XLSX.");
      return res.status(400).json({ error: "No valid data found in XLSX." });
    }
  } catch (error) {
    console.error("Error importing XLSX:", error);
    return res.status(500).json({ error: "Failed to import towns" });
  }
};

const importLanguagesFromXlsx = async (req, res) => {
  try {
    const workbook = XLSX.readFile(filePathLanguage);
    const sheetName = workbook.SheetNames[0];
    const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]); 

    // Map data to match your DB structure
    const languages = jsonData.map(row => ({
      title: row["Language"]?.trim(),
    }));

    // Bulk insert into database
    if (languages.length > 0) {
      await ListLanguage.bulkCreate(languages, {
        ignoreDuplicates: true
      });
      console.log("XLSX data imported successfully!");
      return res.status(200).json({ message: "XLSX data imported successfully!", inserted: languages.length });
    } else {
      console.log("No valid data found in XLSX.");
      return res.status(400).json({ error: "No valid data found in XLSX." });
    }
  } catch (error) {
    console.error("Error importing XLSX:", error);
    return res.status(500).json({ error: "Failed to import languages" });
  }
};

const importNationalitiesFromXlsx = async (req, res) => {
  try {
    const workbook = XLSX.readFile(filePathNationality);
    const sheetName = workbook.SheetNames[0];
    const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]); 

    // Map data to match your DB structure
    const nationalities = jsonData.map(row => ({
      title: row["Nationality"]?.trim(),
    }));

    // Bulk insert into database
    if (nationalities.length > 0) {
      await ListNationality.bulkCreate(nationalities, {
        ignoreDuplicates: true
      });
      console.log("XLSX data imported successfully!");
      return res.status(200).json({ message: "XLSX data imported successfully!", inserted: nationalities.length });
    } else {
      console.log("No valid data found in XLSX.");
      return res.status(400).json({ error: "No valid data found in XLSX." });
    }
  } catch (error) {
    console.error("Error importing XLSX:", error);
    return res.status(500).json({ error: "Failed to import nationalities" });
  }

};

const importRegionsFromXlsx= async (req, res) => {
  try {
    const workbook = XLSX.readFile(filePathRegion);
    const sheetName = workbook.SheetNames[0];
    const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    console.log(JSON.stringify(jsonData, null, 2));

    
    // Transform Excel data to match DB schema
    const regions = jsonData.map(row => {
      let departmentsData = row["Departements"];
    
      if (typeof departmentsData === "number") {
        departmentsData = [departmentsData.toString()];
      } else if (typeof departmentsData === "string") {
        if (departmentsData.includes(",")) {
          departmentsData = departmentsData.split(",").map(dep => dep.trim());
        } else {
          departmentsData = [departmentsData.trim()];
        }
      } else {
        departmentsData = []; // Use an empty array instead of ['a']
      }
    
      return {
        region: row["Region"]?.trim(), // Change from `region_name` to `region`
        departement_code: departmentsData.join(", ") // Store as a comma-separated string
      };
    });

    // Bulk insert into database
    if (regions.length > 0) {
      await ListRegion.bulkCreate(regions, {
        // ignoreDuplicates: true,
        updateOnDuplicate: ["region"] // Only updates the "region" field if it already exists
      });
      console.log("XLSX data imported successfully!");
      return res.status(200).json({ message: "XLSX data imported successfully!", inserted: regions.length });
    } else {
      console.log("No valid data found in XLSX.");
      return res.status(400).json({ error: "No valid data found in XLSX." });
    }
  } catch (error) {
    console.error("Error importing XLSX:", error);
    return res.status(500).json({ error: "Failed to import regions" });
  }
};

const fetchAndLoadCommunes = async (req, res) => {
  try {
    let page = 1;
    let hasMore = true;

    // Loop through pages and load data
    while (hasMore) {
      const response = await axios.get('https://tabular-api.data.gouv.fr/api/resources/be812cba-6d0f-4130-bc2f-afd1bcfa6be0/data/', {
        params: { page, page_size: 50 },
      });

      const commmunes = response.data.data;
      hasMore = commmunes.length === 50; // Check if more data exists

      // Insert towns into the database
      await ListCommune.bulkCreate(commmunes.map((commune) => ({
        code_commune: commune["#Code_commune_INSEE"],
        name: commune.Nom_de_la_commune,
        code_postal: commune.Code_postal,
        libelle: commune.Libellé_d_acheminement,
      })), {
        ignoreDuplicates: true, // To prevent duplicates if already loaded
      });

      console.log(`Page ${page} loaded`);
      page++;
    }
    return res.status(200).json({ message: "API imported successfully!" });
  } catch (error) {
    console.error('Error fetching towns:', error);
    return res.status(500).json({ error: "Failed to import communes" });
  }
};

const getAllLists = async(req, res) => {
    try {
        const AgeLists = await ListAge.findAll({order: [['id', 'ASC']]});
        const EducationLists = await ListEducation.findAll({order: [['id', 'ASC']]});
        const HeightLists= await ListHeight.findAll({order: [['id', 'ASC']]});
        const KidLists = await ListKid.findAll({order: [['id', 'ASC']]});
        const OrigineLists = await ListOrigine.findAll({order: [['id', 'ASC']]});
        const PassionLists = await ListPassion.findAll({order: [['id', 'ASC']]});
        const ReligionLists = await ListReligion.findAll({order: [['id', 'ASC']]});
        const SilhouetteLists = await ListSilhouette.findAll({order: [['id', 'ASC']]});
        const SmokerLists = await ListSmoker.findAll({order: [['id', 'ASC']]});
        const TattooLists = await ListTattoo.findAll({order: [['id', 'ASC']]});
        const TownOptionLists = await ListTownOption.findAll({order: [['id', 'ASC']]});

        return res.status(200).json({
            ageList: AgeLists,
            educationList: EducationLists,
            heightList: HeightLists,
            kidList: KidLists,
            origineList: OrigineLists,
            passionList: PassionLists,
            religionList: ReligionLists,
            silhouetteList: SilhouetteLists,
            smokerList: SmokerLists,
            tattooList: TattooLists,
            townList: TownOptionLists,
        });
      } catch (error) {
        console.error("Error fetching lists:", error);
        return res.status(500).json({ message: "Internal server error" });
      }
}

const getAllCommunes = async (req, res) => {
  try {
    const { page = 1, page_size = 50, search = "" } = req.query;

    if (search && search.length >= 2) { // Only search if at least 2 chars
      // Normalize the search term
      const normalizedSearch = search
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[\s\-']/g, '');

      // Fetch communes with a broad database filter first (first 2 chars of original search)
      const broadSearch = search.substring(0, 2);
      
      const allCommunes = await ListCommune.findAll({
        where: {
          name: {
            [Sequelize.Op.iLike]: `${broadSearch}%`,
          },
        },
        limit: 2000,
        order: [['name', 'ASC']],
      });

      // Filter based on normalized names
      const filtered = allCommunes.filter(commune => {
        const normalizedName = commune.name
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[\s\-']/g, '');
        
        return normalizedName.startsWith(normalizedSearch);
      });

      const totalCount = filtered.length;
      const paginated = filtered.slice((page - 1) * page_size, page * page_size);
      const hasMore = totalCount > page * page_size;

      res.json({
        communes: paginated.map(commune => ({
          value: commune.id,
          label: commune.name + " (" + commune.code_postal + ")",
        })),
        hasMore,
        nextPage: hasMore ? page + 1 : null,
      });
    } else {
      // No search OR search too short: normal pagination
      const result = await ListCommune.findAndCountAll({
        limit: page_size,
        offset: (page - 1) * page_size,
        order: [['name', 'ASC']],
      });

      const hasMore = result.count > page * page_size;

      res.json({
        communes: result.rows.map(commune => ({
          value: commune.id,
          label: commune.name + " (" + commune.code_postal + ")",
        })),
        hasMore,
        nextPage: hasMore ? page + 1 : null,
      });
    }
  } catch (error) {
    console.error("Error fetching communes:", error.message);
    res.status(500).json({ error: "Failed to fetch communes" });
  }
};



const getAllTowns = async (req, res) => {
  try {
    const { page = 1, page_size = 20, search = "" } = req.query;

    let towns = [];
    let count = 0;

    if (search) {
      
      const startsWith = await ListTown.findAll({
        where: {
          town: {
            [Sequelize.Op.iLike]: `${search}%`,
          },
        },
        order: [['town', 'ASC']],
      });

      const contains = await ListTown.findAll({
        where: {
          town: {
            [Sequelize.Op.iLike]: `%${search}%`,
          },
          // Exclude towns already in startsWith
          id: {
            [Sequelize.Op.notIn]: startsWith.map(t => t.id),
          },
        },
        order: [['town', 'ASC']],
      });

      // const all = [...startsWith, ...contains];
      const all = [...startsWith];
      count = all.length;

      // Manual pagination
      const paginated = all.slice((page - 1) * page_size, page * page_size);
      const hasMore = page * page_size < count;

      return res.json({
        towns: paginated.map(town => ({
          value: town.id,
          label: town.town,
        })),
        hasMore,
        nextPage: hasMore ? Number(page) + 1 : null,
      });
    } else {
      // No search: do normal paginated query
      const townsQuery = await ListTown.findAndCountAll({
        limit: page_size,
        offset: (page - 1) * page_size,
        order: [['town', 'ASC']],
      });

      const hasMore = townsQuery.count > page * page_size;

      return res.json({
        towns: townsQuery.rows.map(town => ({
          value: town.id,
          label: town.town,
        })),
        hasMore,
        nextPage: hasMore ? Number(page) + 1 : null,
      });
    }
  } catch (error) {
    console.error("Error fetching towns:", error.message);
    res.status(500).json({ error: "Failed to fetch towns" });
  }
};


const getAllLanguages = async (req, res) => {
  try {
    const { page = 1, page_size = 20, search = "" } = req.query;

    const where = {};
    if (search) {
      where.title = { [Sequelize.Op.iLike]: `%${search}%` }; // Case-insensitive search
    }

    const languages = await ListLanguage.findAndCountAll({
      where,
      limit: page_size,
      offset: (page - 1) * page_size,
    });

    const hasMore = languages.count > page * page_size;

    res.json({
      languages: languages.rows.map(language => ({
        value: language.id,
        label: language.title,
      })),
      hasMore,
      nextPage: hasMore ? Number(page) + 1 : null,
    });

  } catch (error) {
    console.error("Error fetching languages:", error.message);
    res.status(500).json({ error: "Failed to fetch languages" });
  }
}

const getAllNationalities = async (req, res) => {
  try {
    const { page = 1, page_size = 20, search = "" } = req.query;

    const where = {};
    if (search) {
      where.title = { [Sequelize.Op.iLike]: `%${search}%` }; // Case-insensitive search
    }

    const nationalities = await ListNationality.findAndCountAll({
      where,
      limit: page_size,
      offset: (page - 1) * page_size,
    });

    const hasMore = nationalities.count > page * page_size;

    res.json({
      nationalities: nationalities.rows.map(nationality => ({
        value: nationality.id,
        label: nationality.title,
      })),
      hasMore,
      nextPage: hasMore ? Number(page) + 1 : null,
    });

  } catch (error) {
    console.error("Error fetching nationality:", error.message);
    res.status(500).json({ error: "Failed to fetch nationality" });
  }
}

module.exports = { getAllLists, fetchAndLoadCommunes, getAllCommunes,updateTownCodesFromXlsx,importTownsFromXlsx, getAllTowns, importLanguagesFromXlsx, importNationalitiesFromXlsx, importRegionsFromXlsx, getAllLanguages, getAllNationalities };

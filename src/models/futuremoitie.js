// src/models/profileAidant.js
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class FutureMoitie extends Model {
    static associate(models) {
        FutureMoitie.belongsTo(models.ProfileAide, { foreignKey: "aide_id", as: "aide"});

        // FutureMoitie.belongsTo(models.ListOrigine, { foreignKey: "origine_id", as: "origine" });
        // FutureMoitie.belongsTo(models.ListReligion, { foreignKey: "religion_id", as: "religion" });
        // FutureMoitie.belongsTo(models.ListEducation, { foreignKey: "education_id", as: "education" });
        // FutureMoitie.belongsTo(models.ListHeight, { foreignKey: "height_id", as: "height" });
        // FutureMoitie.belongsTo(models.ListSilhouette, { foreignKey: "silhouette_id", as: "silhouette" });
        // FutureMoitie.belongsTo(models.ListSmoker, { foreignKey: "smoker_id", as: "smoker" });
        // FutureMoitie.belongsTo(models.ListTattoo, { foreignKey: "tattoo_id", as: "tattoo" });
        // FutureMoitie.belongsTo(models.ListKid, { foreignKey: "kids_id", as: "kids" });

        // FutureMoitie.belongsTo(models.ListLanguage, { foreignKey: "language_id", as: "language" });
        // FutureMoitie.belongsTo(models.ListNationality, { foreignKey: "nationality_id", as: "nationality" });

        // Many-to-Many relationships
        FutureMoitie.belongsToMany(models.ListAge, {
            through: "FutureMoitieAges",
            foreignKey: "future_moitie_id",
            otherKey: "age_id", 
            as: "ages",
        });

        FutureMoitie.belongsToMany(models.ListTownOption, {
            through: "FutureMoitieTownOptions",
            foreignKey: "future_moitie_id",
            otherKey: "townOption_id", 
            as: "townOptions",
        });
        
        FutureMoitie.belongsToMany(models.ListPassion, {
            through: "FutureMoitiePassions",
            foreignKey: "future_moitie_id",
            otherKey: "passion_id", 
            as: "passions",
        });

        FutureMoitie.belongsToMany(models.ListReligion, {
            through: "FutureMoitieReligions",
            foreignKey: "future_moitie_id",
            otherKey: "religion_id", 
            as: "religions",
        });
        FutureMoitie.belongsToMany(models.ListLanguage, {
            through: "FutureMoitieLanguages",
            foreignKey: "future_moitie_id",
            otherKey: "language_id", 
            as: "languages",
        });
        FutureMoitie.belongsToMany(models.ListEducation, {
            through: "FutureMoitieEducations",
            foreignKey: "future_moitie_id",
            otherKey: "education_id", 
            as: "educations",
        });
        FutureMoitie.belongsToMany(models.ListHeight, {
            through: "FutureMoitieHeights",
            foreignKey: "future_moitie_id",
            otherKey: "height_id", 
            as: "heights",
        });
        FutureMoitie.belongsToMany(models.ListOrigine, {
            through: "FutureMoitieOrigines",
            foreignKey: "future_moitie_id",
            otherKey: "origine_id", 
            as: "origines",
        });
        FutureMoitie.belongsToMany(models.ListNationality, {
            through: "FutureMoitieNationalities",
            foreignKey: "future_moitie_id",
            otherKey: "nationality_id", 
            as: "nationalities",
        });
        FutureMoitie.belongsToMany(models.ListKid, {
            through: "FutureMoitieKids",
            foreignKey: "future_moitie_id",
            otherKey: "kid_id", 
            as: "kids",
        });
        FutureMoitie.belongsToMany(models.ListSilhouette, {
            through: "FutureMoitieSilhouettes",
            foreignKey: "future_moitie_id",
            otherKey: "silhouette_id", 
            as: "silhouettes",
        });
        FutureMoitie.belongsToMany(models.ListSmoker, {
            through: "FutureMoitieSmokers",
            foreignKey: "future_moitie_id",
            otherKey: "smoker_id", 
            as: "smokers",
        });
        FutureMoitie.belongsToMany(models.ListTattoo, {
            through: "FutureMoitieTattoos",
            foreignKey: "future_moitie_id",
            otherKey: "tattoo_id", 
            as: "tattoos",
        });
    }
  }

  FutureMoitie.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      aide_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'ProfileAides',
          key: 'id',
        },
      },
      gender: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notNull: { msg: "Gender is required." },
          notEmpty: { msg: "Gender is required." },
        },
      },
      description: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'FutureMoitie',
      timestamps: true,
    }
  );

  return FutureMoitie;
};

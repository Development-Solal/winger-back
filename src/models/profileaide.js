const {Model, DataTypes} = require("sequelize");

module.exports = (sequelize) => {
    class ProfileAide extends Model {
        static associate(models) {
            // Relations to predefined lists
            ProfileAide.belongsTo(models.ProfileAidant, {foreignKey: "aidant_id"});
            ProfileAide.hasOne(models.FutureMoitie, {foreignKey: "aide_id", as: "futureMoitie"});

            ProfileAide.belongsTo(models.ListAge, {foreignKey: "age_id", as: "age"});
            ProfileAide.belongsTo(models.ListOrigine, {foreignKey: "origine_id", as: "origine"});
            ProfileAide.belongsTo(models.ListReligion, {foreignKey: "religion_id", as: "religion"});
            ProfileAide.belongsTo(models.ListEducation, {foreignKey: "education_id", as: "education"});
            ProfileAide.belongsTo(models.ListHeight, {foreignKey: "height_id", as: "height"});
            ProfileAide.belongsTo(models.ListSilhouette, {foreignKey: "silhouette_id", as: "silhouette"});
            ProfileAide.belongsTo(models.ListSmoker, {foreignKey: "smoker_id", as: "smoker"});
            ProfileAide.belongsTo(models.ListTattoo, {foreignKey: "tattoo_id", as: "tattoo"});

            ProfileAide.belongsTo(models.ListCommune, {foreignKey: "commune_id", as: "commune"});
            ProfileAide.belongsTo(models.ListTown, {foreignKey: "town_id", as: "town"});
            ProfileAide.belongsTo(models.ListNationality, {foreignKey: "nationality_id", as: "nationality"});

            // Many-to-Many relationships
            ProfileAide.belongsToMany(models.ListKid, {
                through: "ProfileAideKids",
                foreignKey: "profile_aide_id",
                otherKey: "kid_id",
                as: "kids",
            });

            ProfileAide.belongsToMany(models.ListPassion, {
                through: "ProfileAidePassions",
                foreignKey: "profile_aide_id",
                otherKey: "passion_id",
                as: "passions",
            });

            ProfileAide.belongsToMany(models.ListLanguage, {
                through: "ProfileAideLanguages",
                foreignKey: "profile_aide_id",
                otherKey: "language_id",
                as: "language",
            });

            ProfileAide.hasOne(models.GdprAide, {
                foreignKey: "profile_aide_id",
                as: "GdprAideConsent",
            });
        }
    }

    ProfileAide.init(
        {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },
            aidant_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: {
                    model: "ProfileAidants",
                    key: "id",
                },
            },
            profile_number: {
                type: DataTypes.STRING,
                allowNull: true,
                unique: {
                    msg: "Profile Number already exists.",
                },
            },
            profile_pic: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            gender: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            name: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            email: {
                type: DataTypes.STRING,
                allowNull: true,
                validate: {
                    isEmail: true,
                },
            },
            aidant_is_aide: {
                type: DataTypes.STRING,
                allowNull: true
            },
            aidant_relation: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            description: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            active: {
                type: DataTypes.BOOLEAN,
                defaultValue: false,
                allowNull: false,
            },
            all_required_accepted: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            aidant_deactivated: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            is_suspended: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            deactivation_reason: {
                type: DataTypes.STRING,
                allowNull: true,
            },
        },
        {
            sequelize,
            modelName: "ProfileAide",
            timestamps: true,
        }
    );

    return ProfileAide;
};

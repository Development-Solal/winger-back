// src/models/profileAidant.js
const {Model, DataTypes} = require('sequelize');

module.exports = (sequelize) => {
    class ProfileAidant extends Model {
        static associate(models) {
            ProfileAidant.hasOne(models.ProfileAidantPro, {foreignKey: "aidant_id"});
            ProfileAidant.belongsTo(models.User, {foreignKey: 'user_id'});
            ProfileAidant.belongsTo(models.ProfileTypeAidant, {foreignKey: 'profile_type_id'});

            ProfileAidant.belongsTo(models.ListCommune, {foreignKey: "commune_id", as: "commune"});
            ProfileAidant.belongsTo(models.ListTown, {foreignKey: "town_id", as: "town"});
            ProfileAidant.belongsTo(models.ListAge, {foreignKey: "age_id", as: "age"});

            ProfileAidant.hasOne(models.Subscription, {foreignKey: "aidant_id", as: "subscription",});
        }
    }

    ProfileAidant.init(
        {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },
            user_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: {
                    model: 'Users',
                    key: 'id',
                },
            },
            profile_type_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: {
                    model: 'ProfileTypeAidants',
                    key: 'id',
                },
            },
            profile_number: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: {
                    msg: "Profile Number already exists."
                },
                validate: {
                    notNull: {
                        msg: "Profile Number is required."
                    },
                    notEmpty: {
                        msg: "Profile Number is required."
                    }
                },
            },
            profile_pic: {
                type: DataTypes.STRING,
                allowNull: false,
                validate: {
                    notNull: {
                        msg: "Profile picture is required."
                    },
                    notEmpty: {
                        msg: "Profile picture is required."
                    }
                },
            },
            first_name: {
                type: DataTypes.STRING,
                allowNull: false,
                validate: {
                    notNull: {
                        msg: "First name is required."
                    },
                    notEmpty: {
                        msg: "First name is required."
                    }
                },
            },
            last_name: {
                type: DataTypes.STRING,
                allowNull: false,
                validate: {
                    notNull: {
                        msg: "Last name is required."
                    },
                    notEmpty: {
                        msg: "Last name is required."
                    }
                },
            },
            email: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: {
                    msg: "Email already exists."
                },
                validate: {
                    isEmail: {
                        msg: "Email is invalid."
                    },
                    notNull: {
                        msg: "Email is required."
                    },
                    notEmpty: {
                        msg: "Email is required."
                    }
                },
            },
            password: {
                type: DataTypes.STRING,
                allowNull: false,
                validate: {
                    notNull: {
                        msg: "Password is required."
                    },
                    notEmpty: {
                        msg: "Password is required."
                    },
                    len: {
                        args: [6, 255],
                        msg: "Password must be atleast 6 characters."
                    }
                },
            },
            age_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
                validate: {
                    isValidAge(value) {
                        if (this.profile_type_id === 1 && (value === null || value === undefined || value === "")) {
                            throw new Error('Age is required for this profile type.');
                        }
                    },
                },
            },
            town_id: {
                type: DataTypes.STRING,
                allowNull: false,
                validate: {
                    notNull: {
                        msg: "Town is required."
                    },
                    notEmpty: {
                        msg: "Town is required."
                    }
                },
            },
            commune_id: {
                type: DataTypes.STRING,
                allowNull: true,
                validate: {
                    isValidAge(value) {
                        if (this.profile_type_id === 1 && (value === null || value === undefined || value === "")) {
                            throw new Error('Commune is required for this profile type.');
                        }
                    },
                },
            },
            // aidant_is_aide: {
            //     type: DataTypes.STRING,
            //     allowNull: true,
            //     validate: {
            //         isValidAge(value) {
            //             if (this.profile_type_id === 1 && (value === null || value === undefined || value === "")) {
            //                 throw new Error('Is Aidant same person as Aide is required for this profile type.');
            //             }
            //         },
            //     },
            // },
            active: {
                type: DataTypes.BOOLEAN,
                defaultValue: true,
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
            online: {
                type: DataTypes.BOOLEAN,
                defaultValue: false,
            },
            last_seen_at: {
                type: DataTypes.DATE,
                allowNull: true,
            },
        },
        {
            sequelize,
            modelName: 'ProfileAidant',
            timestamps: true,
        }
    );

    return ProfileAidant;
};
// src/models/profileAidant.js
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class ProfileAidantPro extends Model {
    static associate(models) {
      ProfileAidantPro.belongsTo(models.ProfileAidant, { foreignKey: 'aidant_id' });
    }
  }

  ProfileAidantPro.init(
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
          model: 'ProfileAidants',
          key: 'id',
        },
      },
        contract_signed: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
      company_id: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: {
            msg: "Company ID already exists."
        },
        validate: {
            notNull: {
              msg: "Company ID is required."
            },
            notEmpty: {
              msg: "Company ID is required."
            }
        },
      },
      company_name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notNull: {
              msg: "Company name is required."
            },
            notEmpty: {
              msg: "Company name is required."
            }
        },
      },
      company_description: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notNull: {
              msg: "Company description is required."
            },
            notEmpty: {
              msg: "Company description is required."
            }
        },
      },
    },
    {
      sequelize,
      modelName: 'ProfileAidantPro',
      timestamps: true,
    }
  );

  return ProfileAidantPro;
};

"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class GdprAide extends Model {
    static associate(models) {
      // Association to User (Aidant)
      GdprAide.belongsTo(models.User, {
        foreignKey: "aidant_id",
        as: "Aidant",
      });

      // Association to ProfileAide
      GdprAide.belongsTo(models.ProfileAide, {
        foreignKey: "profile_aide_id",
        as: "ProfileAide",
      });
    }
  }

  GdprAide.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      aidant_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "Users",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      profile_aide_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "ProfileAides",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      email_aide: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          isEmail: {
            msg: "L'adresse email n'est pas valide"
          },
        },
      },
      consent_token: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      consent: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: null,
        comment: "GDPR consent data with timestamps",
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: "GdprAide",
      tableName: "GdprAides",
      timestamps: true,
      underscored: true,
    }
  );

  return GdprAide;
};
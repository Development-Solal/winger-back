'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Favorite extends Model {
    static associate(models) {
      // Define association here
      Favorite.belongsTo(models.ProfileAidant, { foreignKey: "aidant_id", as: "aidant" });
      Favorite.belongsTo(models.ProfileAide, { foreignKey: "aide_id", as: "aide" });
      Favorite.belongsTo(models.ProfileAide, { foreignKey: "fav_aide_id", as: "favAide" });
    }
  }
  Favorite.init(
    {
      aidant_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          validate: {
            notNull: {
              msg: "Aidant Id is required."
            }
          },
          references: {
              model: "ProfileAidants",
              key: "id",
          },
          onDelete: "CASCADE",
      },
      aide_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          notNull: {
            msg: "Aide Id is required."
          }
        },
        references: {
            model: "ProfileAides",
            key: "id",
        },
        onDelete: "CASCADE",
      },
      fav_aide_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          validate: {
            notNull: {
              msg: "Fav Aide Id is required."
            }
          },
          references: {
              model: "ProfileAides",
              key: "id",
          },
          onDelete: "CASCADE",
      },
    },
    {
      sequelize,
      modelName: 'Favorite',
    }
  );
  return Favorite;
};

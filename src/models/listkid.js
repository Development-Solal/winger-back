const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ListKid extends Model {
    static associate(models) {
      ListKid.belongsToMany(models.ProfileAide, {
        through: "ProfileAideKids",
        foreignKey: "kid_id",    
        otherKey: "profile_aide_id",   
        as: "profileAides",
      });   
      ListKid.belongsToMany(models.FutureMoitie, {
        through: "FutureMoitieKids",
        foreignKey: "kid_id",    
        otherKey: "future_moitie_id",   
        as: "futureMoities",
      });   
    }
  }
  ListKid.init(
    {
      title: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: {
          msg: "Kid already exists"
        },
        validate: {
          notNull: {
            msg: "Kid title is required."
          }
        }
      },
    },
    {
      sequelize,
      modelName: 'ListKid',
      timestamps: true,
    }
  );
  return ListKid;
};

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ListPassion extends Model {
    static associate(models) {
      ListPassion.belongsToMany(models.ProfileAide, {
        through: "ProfileAidePassions",
        foreignKey: "passion_id",    
        otherKey: "profile_aide_id",   
        as: "profileAides",
      });    
      ListPassion.belongsToMany(models.FutureMoitie, {
        through: "FutureMoitiePassions",
        foreignKey: "passion_id",    
        otherKey: "future_moitie_id",   
        as: "futureMoities",
      });   
    }
  }
  ListPassion.init(
    {
      title: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: {
          msg: "Passion already exists"
        },
        validate: {
          notNull: {
            msg: "Passion title is required."
          }
        }
      },
    },
    {
      sequelize,
      modelName: 'ListPassion',
      timestamps: true,
    }
  );
  return ListPassion;
};

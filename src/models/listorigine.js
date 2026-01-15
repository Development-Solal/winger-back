const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ListOrigine extends Model {
    static associate(models) {
       ListOrigine.belongsToMany(models.FutureMoitie, {
        through: "FutureMoitieOrigines",
        foreignKey: "origine_id",    
        otherKey: "future_moitie_id",   
        as: "futureMoities",
      });     
    }
  }
  ListOrigine.init(
    {
      title: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: {
          msg: "Origine already exists"
        },
        validate: {
          notNull: {
            msg: "Origine title is required."
          }
        }
      },
    },
    {
      sequelize,
      modelName: 'ListOrigine',
      timestamps: true,
    }
  );
  return ListOrigine;
};

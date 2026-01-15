const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ListNationality extends Model {
    static associate(models) {
      ListNationality.belongsToMany(models.FutureMoitie, {
        through: "FutureMoitieNationalities",
        foreignKey: "nationality_id",    
        otherKey: "future_moitie_id",   
        as: "futureMoities",
      });     
    }
  }
  ListNationality.init(
    {
      title: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: {
          msg: "Nationality already exists"
        },
        validate: {
          notNull: {
            msg: "Nationality title is required."
          }
        }
      },
    },
    {
      sequelize,
      modelName: 'ListNationality',
      timestamps: true,
    }
  );
  return ListNationality;
};

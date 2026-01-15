const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ListSmoker extends Model {
    static associate(models) {
      // Define association here
      ListSmoker.belongsToMany(models.FutureMoitie, {
        through: "FutureMoitieSmokers",
        foreignKey: "smoker_id",    
        otherKey: "future_moitie_id",   
        as: "futureMoities",
      }); 
    }
  }
  ListSmoker.init(
    {
      title: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: {
          msg: "Smoker already exists"
        },
        validate: {
          notNull: {
            msg: "Smoker title is required."
          }
        }
      },
    },
    {
      sequelize,
      modelName: 'ListSmoker',
      timestamps: true,
    }
  );
  return ListSmoker;
};

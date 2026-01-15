const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ListTownOption extends Model {
    static associate(models) {
      // Define association here
      ListTownOption.belongsToMany(models.FutureMoitie, {
        through: "FutureMoitieTownOptions",
        foreignKey: "townOption_id",    
        otherKey: "future_moitie_id",   
        as: "futureMoities",
      });  
    }
  }
  ListTownOption.init(
    {
      title: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: {
          msg: "Town already exists"
        },
        validate: {
          notNull: {
            msg: "Town title is required."
          }
        }
      },
    },
    {
      sequelize,
      modelName: 'ListTownOption',
      timestamps: true,
    }
  );
  return ListTownOption;
};

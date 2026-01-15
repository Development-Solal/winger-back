const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ListReligion extends Model {
    static associate(models) {
      // Define association here
      ListReligion.belongsToMany(models.FutureMoitie, {
        through: "FutureMoitieReligions",
        foreignKey: "religion_id",    
        otherKey: "future_moitie_id",   
        as: "futureMoities",
      }); 
    }
  }
  ListReligion.init(
    {
      title: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: {
          msg: "Religion already exists"
        },
        validate: {
          notNull: {
            msg: "Religion title is required."
          }
        }
      },
    },
    {
      sequelize,
      modelName: 'ListReligion',
      timestamps: true,
    }
  );
  return ListReligion;
};

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ListAge extends Model {
    static associate(models) {
      // Define association here
      ListAge.belongsToMany(models.FutureMoitie, {
        through: "FutureMoitieAges",
        foreignKey: "age_id",    
        otherKey: "future_moitie_id",   
        as: "futureMoities",
      });   
    }
  }
  ListAge.init(
    {
      title: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: {
          msg: "Age already exists"
        },
        validate: {
          notNull: {
            msg: "Age title is required."
          }
        }
      },
    },
    {
      sequelize,
      modelName: 'ListAge',
      timestamps: true,
    }
  );
  return ListAge;
};

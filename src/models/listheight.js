const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ListHeight extends Model {
    static associate(models) {
      ListHeight.belongsToMany(models.FutureMoitie, {
        through: "FutureMoitieHeights",
        foreignKey: "height_id",    
        otherKey: "future_moitie_id",   
        as: "futureMoities",
      }); 
    }
  }
  ListHeight.init(
    {
      title: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: {
          msg: "Height already exists"
        },
        validate: {
          notNull: {
            msg: "Height title is required."
          }
        }
      },
    },
    {
      sequelize,
      modelName: 'ListHeight',
      timestamps: true,
    }
  );
  return ListHeight;
};

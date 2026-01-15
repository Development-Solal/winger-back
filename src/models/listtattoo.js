const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ListTattoo extends Model {
    static associate(models) {
      // Define association here
      ListTattoo.belongsToMany(models.FutureMoitie, {
        through: "FutureMoitieTattoos",
        foreignKey: "tattoo_id",    
        otherKey: "future_moitie_id",   
        as: "futureMoities",
      }); 
    }
  }
  ListTattoo.init(
    {
      title: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: {
          msg: "Tattoo already exists"
        },
        validate: {
          notNull: {
            msg: "Tattoo title is required."
          }
        }
      },
    },
    {
      sequelize,
      modelName: 'ListTattoo',
      timestamps: true,
    }
  );
  return ListTattoo;
};

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ListEducation extends Model {
    static associate(models) {
      // Define association here
      ListEducation.belongsToMany(models.FutureMoitie, {
        through: "FutureMoitieEducations",
        foreignKey: "education_id",    
        otherKey: "future_moitie_id",   
        as: "futureMoities",
      }); 
    }
  }
  ListEducation.init(
    {
      title: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: {
          msg: "Education already exists"
        },
        validate: {
          notNull: {
            msg: "Education title is required."
          }
        }
      },
    },
    {
      sequelize,
      modelName: 'ListEducation',
      timestamps: true,
    }
  );
  return ListEducation;
};

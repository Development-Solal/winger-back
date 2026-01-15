const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ListLanguage extends Model {
    static associate(models) {
      // Define association here
      ListLanguage.belongsToMany(models.ProfileAide, {
        through: "ProfileAideLanguages",
        foreignKey: "language_id",    
        otherKey: "profile_aide_id",   
        as: "profileAides",
      }); 
      ListLanguage.belongsToMany(models.FutureMoitie, {
        through: "FutureMoitieLanguages",
        foreignKey: "language_id",    
        otherKey: "future_moitie_id",   
        as: "futureMoities",
      }); 
    }
  }
  ListLanguage.init(
    {
      title: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: {
          msg: "Language already exists"
        },
        validate: {
          notNull: {
            msg: "Language title is required."
          }
        }
      },
    },
    {
      sequelize,
      modelName: 'ListLanguage',
      timestamps: true,
    }
  );
  return ListLanguage;
};

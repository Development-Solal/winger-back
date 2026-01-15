const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ListSilhouette extends Model {
    static associate(models) {
      // Define association here
      ListSilhouette.belongsToMany(models.FutureMoitie, {
        through: "FutureMoitieSilhouettes",
        foreignKey: "silhouette_id",    
        otherKey: "future_moitie_id",   
        as: "futureMoities",
      }); 
    }
  }
  ListSilhouette.init(
    {
      title: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: {
          msg: "Silhouette already exists"
        },
        validate: {
          notNull: {
            msg: "Silhouette title is required."
          }
        }
      },
    },
    {
      sequelize,
      modelName: 'ListSilhouette',
      timestamps: true,
    }
  );
  return ListSilhouette;
};

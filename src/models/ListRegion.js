const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ListRegion extends Model {
    static associate(models) {
      // Define association here
    }
  }
  ListRegion.init(
    {
      region: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: {
          msg: "Region already exists"
        },
        validate: {
          notNull: {
            msg: "Region title is required."
          }
        }
      },
      departement_code: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notNull: {
            msg: "Departement code is required."
          }
        }
      },
    },
    {
      sequelize,
      modelName: 'ListRegion',
      timestamps: true,
    }
  );
  return ListRegion;
};

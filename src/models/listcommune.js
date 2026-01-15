const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ListCommune extends Model {
    static associate(models) {
      // Define association here
    }
  }
  ListCommune.init(
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        code_commune: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: {
              msg: "Commune already exists"
          },
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                notNull: {
                    msg: "Commune title is required."
                }
            }
        },
        code_postal: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        libelle: {
            type: DataTypes.STRING,
            allowNull: false,
        },
    },
    {
      sequelize,
      modelName: 'ListCommune',
      timestamps: true,
    }
  );
  return ListCommune;
};

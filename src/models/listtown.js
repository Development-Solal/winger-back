const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ListTown extends Model {
    static associate(models) {
      // Define association here
    }
  }
  ListTown.init(
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        town: {
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
        Code: {
            type: DataTypes.STRING,
            allowNull: true,
        },
    },
    {
      sequelize,
      modelName: 'ListTown',
      timestamps: true,
    }
  );
  return ListTown;
};

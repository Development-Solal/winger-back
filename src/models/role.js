'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Role extends Model {
    static associate(models) {
      // Define association here
      Role.hasMany(models.User, {
        foreignKey: 'roleId',
        as: 'Users',
      });
    }
  }
  Role.init(
    {
      title: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: {
          msg: "Role already exists"
        },
        validate: {
          notNull: {
            msg: "Role title is required."
          }
        }
      },
    },
    {
      sequelize,
      modelName: 'Role',
    }
  );
  return Role;
};

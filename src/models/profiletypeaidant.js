'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ProfileTypeAidant extends Model {
    static associate(models) {
      // define association here
    }
  }

  ProfileTypeAidant.init({
    title_fr: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: {
        msg: "This profile already exists."
      },
      validate: {
        notNull: {
          msg: "Title is required."
        },
        notEmpty: {
          msg: "Title is required."
        }
      },
    },
    title_eng: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: {
        msg: "This profile already exists."
      },
      validate: {
        notNull: {
          msg: "Title is required."
        },
        notEmpty: {
          msg: "Title is required."
        }
      },
    },
  }, {
    sequelize,
    modelName: 'ProfileTypeAidant',
  });
  return ProfileTypeAidant;
};
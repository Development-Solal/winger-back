'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      // Define association here
      User.belongsTo(models.Role, {
        foreignKey: 'roleId',
        as: 'role',
      });
      User.hasOne(models.ProfileAidant, { foreignKey: 'user_id' });
    }
  }
  User.init(
    {
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: {
          msg: "Email already exists."
        },
        validate: {
          isEmail: {
            msg: "Email is invalid."
          },
          notNull: {
            msg: "Email is required."
          },
          notEmpty: {
            msg: "Email is required."
          }
        },
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notNull: {
            msg: "Password is required."
          },
          notEmpty: {
            msg: "Password is required."
          },
          len: {
            args: [6, 255],
            msg: "Password must be atleast 6 characters."
          }
        },
      },
      first_name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notNull: {
            msg: "First Name is required."
          },
          notEmpty: {
            msg: "First Name is required."
          },
        }
      },
      last_name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notNull: {
            msg: "Last Name is required."
          },
          notEmpty: {
            msg: "Last Name is required."
          },
        }
      },
      roleId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'Roles',
          key: 'id',
        },
      },
      refreshToken: {
        type: DataTypes.STRING,
      },
      is_email_verified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      email_verification_token: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      credits: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
        validate: {
          min: {
            args: [0],
            msg: 'Credits cannot be less than 0.',
          },
        },
      },

      //added these 2 new fields for push notification
      expo_push_token : {
        type: DataTypes.STRING,
        allowNull: true,
      },
      last_token_update:{
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'User',
    }
  );
  return User;
};

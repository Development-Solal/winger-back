"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("ProfileAides", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      aidant_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "ProfileAidants",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      profile_number: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      profile_pic: {
        type: Sequelize.STRING, // Store image URL or base64 string
        allowNull: true,
      },
      gender: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      aidant_relation: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      description: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      age_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "ListAges",
          key: "id",
        },
      },
      origine_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "ListOrigines",
          key: "id",
        },
        onDelete: "SET NULL",
      },
      religion_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "ListReligions",
          key: "id",
        },
        onDelete: "SET NULL",
      },
      education_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "ListEducations",
          key: "id",
        },
        onDelete: "SET NULL",
      },
      height_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "ListHeights",
          key: "id",
        },
        onDelete: "SET NULL",
      },
      silhouette_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "ListSilhouettes",
          key: "id",
        },
        onDelete: "SET NULL",
      },
      smoker_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "ListSmokers",
          key: "id",
        },
        onDelete: "SET NULL",
      },
      tattoo_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "ListTattoos",
          key: "id",
        },
        onDelete: "SET NULL",
      },
      commune_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "ListCommunes",
          key: "id",
        },
        onDelete: "SET NULL",
      },
      town_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "ListTowns",
          key: "id",
        },
        onDelete: "SET NULL",
      },
      // language_id: {
      //   type: Sequelize.INTEGER,
      //   allowNull: true,
      //   references: {
      //     model: "ListLanguages",
      //     key: "id",
      //   },
      //   onDelete: "SET NULL",
      // },
      nationality_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "ListNationalities",
          key: "id",
        },
        onDelete: "SET NULL",
      },
      active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      deactivation_reason: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("ProfileAides");
  },
};

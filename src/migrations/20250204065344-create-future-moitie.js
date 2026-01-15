"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("FutureMoities", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      aide_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "ProfileAides",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      gender: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      description: {
        type: Sequelize.STRING,
        allowNull: true,
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
      // religion_id: {
      //   type: Sequelize.INTEGER,
      //   allowNull: true,
      //   references: {
      //     model: "ListReligions",
      //     key: "id",
      //   },
      //   onDelete: "SET NULL",
      // },
      // education_id: {
      //   type: Sequelize.INTEGER,
      //   allowNull: true,
      //   references: {
      //     model: "ListEducations",
      //     key: "id",
      //   },
      //   onDelete: "SET NULL",
      // },
      height_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "ListHeights",
          key: "id",
        },
        onDelete: "SET NULL",
      },
      // silhouette_id: {
      //   type: Sequelize.INTEGER,
      //   allowNull: true,
      //   references: {
      //     model: "ListSilhouettes",
      //     key: "id",
      //   },
      //   onDelete: "SET NULL",
      // },
      // smoker_id: {
      //   type: Sequelize.INTEGER,
      //   allowNull: true,
      //   references: {
      //     model: "ListSmokers",
      //     key: "id",
      //   },
      //   onDelete: "SET NULL",
      // },
      // tattoo_id: {
      //   type: Sequelize.INTEGER,
      //   allowNull: true,
      //   references: {
      //     model: "ListTattoos",
      //     key: "id",
      //   },
      //   onDelete: "SET NULL",
      // },
      kids_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "ListKids",
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
    await queryInterface.dropTable("FutureMoities");
  },
};

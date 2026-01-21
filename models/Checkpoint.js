const { DataTypes } = require("sequelize");
const sequelize = require("../database");
const Scenario = require("./Scenario");

const Checkpoint = sequelize.define(
  "Checkpoint",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    timestamp: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  },
  {
    tableName: "Checkpoint",
    freezeTableName: true,
    timestamps: false
  }
);

Scenario.hasMany(Checkpoint, { foreignKey: "scenarioId" });
Checkpoint.belongsTo(Scenario, { foreignKey: "scenarioId" });

module.exports = Checkpoint;

const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const Line = sequelize.define('Line', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  lineId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  text: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  nextLineId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null
  },
  scenarioId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Scenario',
      key: 'id'
    },
    onDelete: 'CASCADE'
  }
}, {
  tableName: 'Line',
  timestamps: false
});

module.exports = Line;
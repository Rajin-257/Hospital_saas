const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { nanoid } = require('nanoid');
const moment = require('moment');

const Database = sequelize.define('Database', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  host: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'localhost'
  },
  port: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 3306
  },
  username: {
    type: DataTypes.STRING,
    defaultValue : ''
  },
  password: {
    type: DataTypes.STRING,
    defaultValue : ''
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  expiryDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: () => moment().add(15, 'days').toDate() // 15 days free trial
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  lastAccessed: {
    type: DataTypes.DATE,
    allowNull: true
  },
  type: {
    type: DataTypes.ENUM('free', 'paid'),
    defaultValue: 'free'
  },
  domain: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  hooks: {
    beforeCreate: (database) => {
      // Generate a unique database name if not provided
      if (!database.name) {
        const prefix = database.domain.split('.')[0].substring(0, 5);
        database.name = `${prefix}_${nanoid(8)}`.toLowerCase();
      }
    }
  }
});

module.exports = Database;
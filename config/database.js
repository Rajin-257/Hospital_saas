const { Sequelize } = require('sequelize');

// Create a connection to our main database that manages everything
const sequelize = new Sequelize(
  process.env.DB_NAME || 'hospital_Saas',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'production' ? false : console.log,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    timezone: '+06:00' // Bangladesh timezone
  }
);

module.exports = sequelize;
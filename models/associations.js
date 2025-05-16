const User = require('./User');
const Database = require('./Database');
const Payment = require('./Payment');
const Commission = require('./Commission');

// User - Database associations
User.hasMany(Database, { foreignKey: 'userId', as: 'databases' });
Database.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// User - Payment associations
User.hasMany(Payment, { foreignKey: 'userId', as: 'payments' });
Payment.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Database - Payment associations
Database.hasMany(Payment, { foreignKey: 'databaseId', as: 'payments' });
Payment.belongsTo(Database, { foreignKey: 'databaseId', as: 'database' });

// Referral associations (user referred by another user)
User.hasMany(User, { foreignKey: 'referredBy', as: 'referrals' });
User.belongsTo(User, { foreignKey: 'referredBy', as: 'referrer' });

// Commission associations
User.hasMany(Commission, { foreignKey: 'executiveId', as: 'commissions' });
Commission.belongsTo(User, { foreignKey: 'executiveId', as: 'executive' });

User.hasMany(Commission, { foreignKey: 'referredUserId', as: 'referredCommissions' });
Commission.belongsTo(User, { foreignKey: 'referredUserId', as: 'referredUser' });

// Add the missing Payment - Commission association
Payment.hasOne(Commission, { foreignKey: 'paymentId', as: 'commission' });
Commission.belongsTo(Payment, { foreignKey: 'paymentId', as: 'payment' });

module.exports = {
  User,
  Database,
  Payment,
  Commission
}; 
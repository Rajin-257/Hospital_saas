const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Referral = sequelize.define('Referral', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  referrerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    },
    comment: 'ID of the user who referred (executive)'
  },
  referredId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    },
    comment: 'ID of the user who was referred'
  },
  referralCode: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Referral code used'
  },
  status: {
    type: DataTypes.ENUM('pending', 'active', 'completed'),
    defaultValue: 'pending',
    comment: 'Status of the referral'
  },
  activatedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When the referral was activated (user registered)'
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When the referral was completed (first payment made)'
  },
  firstPaymentId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Payments',
      key: 'id'
    },
    comment: 'First payment that triggered completion'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Additional notes or information'
  }
}, {
  indexes: [
    {
      unique: true,
      fields: ['referrerId', 'referredId']
    },
    {
      fields: ['referralCode']
    },
    {
      fields: ['status']
    }
  ]
});

// Associate with User and Payment models
Referral.associate = (models) => {
  Referral.belongsTo(models.User, {
    as: 'referrer',
    foreignKey: 'referrerId'
  });
  
  Referral.belongsTo(models.User, {
    as: 'referred',
    foreignKey: 'referredId'
  });
  
  Referral.belongsTo(models.Payment, {
    as: 'firstPayment',
    foreignKey: 'firstPaymentId'
  });
  
  Referral.hasMany(models.Commission, {
    as: 'commissions',
    foreignKey: 'referralId'
  });
};

// Hooks
Referral.beforeCreate(async (referral) => {
  referral.status = 'active';
  referral.activatedAt = new Date();
});

// Instance methods
Referral.prototype.complete = async function(paymentId) {
  if (this.status !== 'completed') {
    this.status = 'completed';
    this.completedAt = new Date();
    this.firstPaymentId = paymentId;
    await this.save();
  }
};

module.exports = Referral;
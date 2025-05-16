const { check, body } = require('express-validator');
const User = require('../models/User');

/**
 * Common validation rules
 */
const validators = {
  /**
   * User login validation rules
   */
  login: [
    check('email')
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Please enter a valid email address'),
    check('password')
      .notEmpty().withMessage('Password is required')
  ],
  
  /**
   * User registration validation rules
   */
  register: [
    check('fullName')
      .notEmpty().withMessage('Full name is required')
      .isLength({ min: 3 }).withMessage('Full name must be at least 3 characters'),
    check('email')
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Please enter a valid email address')
      .custom(async (value) => {
        const user = await User.findOne({ where: { email: value } });
        if (user) {
          throw new Error('Email is already registered');
        }
        return true;
      }),
    check('phone')
      .notEmpty().withMessage('Phone number is required')
      .matches(/^[0-9+\- ]+$/).withMessage('Phone number can only contain digits, +, - and spaces'),
    check('password')
      .notEmpty().withMessage('Password is required')
      .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    check('confirmPassword')
      .notEmpty().withMessage('Confirm password is required')
      .custom((value, { req }) => {
        if (value !== req.body.password) {
          throw new Error('Passwords do not match');
        }
        return true;
      }),
    check('expectedDomain')
      .notEmpty().withMessage('Expected domain is required')
      .matches(/^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/)
      .withMessage('Please enter a valid domain name'),
    check('referenceCode')
      .notEmpty().withMessage('Reference code is required')
      .custom(async (value) => {
        const referrer = await User.findOne({ where: { referralCode: value } });
        if (!referrer) {
          throw new Error('Invalid reference code');
        }
        return true;
      })
  ],
  
  /**
   * Update user profile validation rules
   */
  updateProfile: [
    check('fullName')
      .notEmpty().withMessage('Full name is required')
      .isLength({ min: 3 }).withMessage('Full name must be at least 3 characters'),
    check('email')
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Please enter a valid email address')
      .custom(async (value, { req }) => {
        const user = await User.findOne({ 
          where: { 
            email: value,
            id: { [Op.ne]: req.session.user.id }
          } 
        });
        if (user) {
          throw new Error('Email is already in use');
        }
        return true;
      }),
    check('phone')
      .notEmpty().withMessage('Phone number is required')
      .matches(/^[0-9+\- ]+$/).withMessage('Phone number can only contain digits, +, - and spaces'),
    check('currentPassword')
      .custom(async (value, { req }) => {
        // Only validate if changing password
        if (req.body.newPassword) {
          if (!value) {
            throw new Error('Current password is required');
          }
          
          const user = await User.findByPk(req.session.user.id);
          const isMatch = await user.isValidPassword(value);
          
          if (!isMatch) {
            throw new Error('Current password is incorrect');
          }
        }
        return true;
      }),
    check('newPassword')
      .custom((value, { req }) => {
        // Only validate if provided
        if (value) {
          if (value.length < 6) {
            throw new Error('New password must be at least 6 characters');
          }
        }
        return true;
      }),
    check('confirmPassword')
      .custom((value, { req }) => {
        // Only validate if changing password
        if (req.body.newPassword) {
          if (value !== req.body.newPassword) {
            throw new Error('Passwords do not match');
          }
        }
        return true;
      })
  ],
  
  /**
   * Create database validation rules
   */
  createDatabase: [
    check('userId')
      .notEmpty().withMessage('User ID is required')
      .custom(async (value) => {
        const user = await User.findByPk(value);
        if (!user) {
          throw new Error('User not found');
        }
        return true;
      }),
    check('domain')
      .notEmpty().withMessage('Domain is required')
      .matches(/^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/)
      .withMessage('Please enter a valid domain name'),
    check('host')
      .optional()
      .isLength({ min: 1 }).withMessage('Host cannot be empty if provided'),
    check('port')
      .optional()
      .isInt({ min: 1, max: 65535 }).withMessage('Port must be between 1 and 65535')
  ],
  
  /**
   * Payment processing validation rules
   */
  processPayment: [
    check('databaseId')
      .notEmpty().withMessage('Database ID is required'),
    check('amount')
      .notEmpty().withMessage('Amount is required')
      .isNumeric().withMessage('Amount must be a number')
      .isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
    check('paymentMethod')
      .notEmpty().withMessage('Payment method is required')
      .isIn(['bkash', 'nagad', 'rocket', 'card']).withMessage('Invalid payment method'),
    check('transactionId')
      .notEmpty().withMessage('Transaction ID is required'),
    check('termsCheck')
      .equals('true').withMessage('You must agree to the terms and conditions')
  ],
  
  /**
   * Update commission validation rules
   */
  updateCommission: [
    check('status')
      .notEmpty().withMessage('Status is required')
      .isIn(['pending', 'paid', 'cancelled']).withMessage('Invalid status')
  ]
};

module.exports = validators;
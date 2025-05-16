const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const authController = require('../controllers/authController');
const { checkRole } = require('../middleware/auth');

// Login page
router.get('/login', authController.getLogin);

// Handle login
router.post('/login', [
  check('email', 'Please enter a valid email').isEmail(),
  check('password', 'Password is required').notEmpty()
], authController.postLogin);

// Register page
router.get('/register', authController.getRegister);

// Handle registration
router.post('/register', [
  check('fullName', 'Name is required').notEmpty(),
  check('email', 'Please enter a valid email').isEmail(),
  check('phone', 'Phone number is required').notEmpty(),
  check('password', 'Password must be at least 6 characters').isLength({ min: 6 }),
  check('expectedDomain', 'Expected domain is required').notEmpty(),
  check('referenceCode', 'Reference code is required').notEmpty()
], authController.postRegister);

// Logout
router.get('/logout', authController.logout);

// Dashboard redirect
router.get('/dashboard', checkRole);

module.exports = router;
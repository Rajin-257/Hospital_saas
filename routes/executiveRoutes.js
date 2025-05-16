const express = require('express');
const router = express.Router();
const executiveController = require('../controllers/executiveController');
const { isExecutive } = require('../middleware/auth');

// Apply executive middleware to all routes
router.use(isExecutive);

// Dashboard
router.get('/dashboard', executiveController.getDashboard);

// Commission History
router.get('/commissions', executiveController.getCommissions);

// Referrals
router.get('/referrals', executiveController.getReferrals);

// Profile
router.get('/profile', executiveController.getProfile);
router.post('/profile', executiveController.updateProfile);

module.exports = router;
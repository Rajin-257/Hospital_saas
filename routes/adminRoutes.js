const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const databaseController = require('../controllers/databaseController');
const paymentController = require('../controllers/paymentController');
const { isAdmin } = require('../middleware/auth');

// Apply admin middleware to all routes
router.use(isAdmin);

// Dashboard
router.get('/dashboard', adminController.getDashboard);

// User Management
router.get('/users', adminController.getUsers);
router.get('/users/:id', adminController.getUserDetails);
router.post('/users/:id', adminController.updateUser);

// Database Management
router.get('/databases', adminController.getDatabases);
router.get('/databases/:id', adminController.getDatabaseDetails);
router.post('/databases/:id', adminController.updateDatabase);
router.delete('/databases/:id', adminController.deleteDb);
router.post('/databases/create', databaseController.createNewDatabase);
router.get('/databases/check-name', databaseController.checkDatabaseName);

// Payment Management
router.get('/payments', adminController.getPayments);

// Commission Management
router.get('/commissions', adminController.getCommissions);
router.post('/commissions/:id', adminController.updateCommission);

// Reports
router.get('/reports', adminController.getReports);

// Settings (could be expanded in a real application)
router.get('/settings', (req, res) => {
  res.render('dashboard/admin/settings', {
    title: 'System Settings'
  });
});

router.post('/settings/payment', paymentController.updatePaymentSettings);

module.exports = router;
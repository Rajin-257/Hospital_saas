const express = require('express');
const router = express.Router();
const databaseController = require('../controllers/databaseController');

// User's database list
router.get('/list', databaseController.getUserDatabases);

// Database details
router.get('/details/:id', databaseController.getDatabaseDetails);

module.exports = router;
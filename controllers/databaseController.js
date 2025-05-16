const User = require('../models/User');
const Database = require('../models/Database');
const { createDatabase, checkDatabaseExists } = require('../services/databaseService');
const { sendWelcomeEmail } = require('../services/mailService');
const { nanoid } = require('nanoid');
const moment = require('moment');
const path = require('path');

// Get user's databases
exports.getUserDatabases = async (req, res) => {
  const userId = req.session.user.id;
  
  try {
    const databases = await Database.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']]
    });
    
    res.render('database/list', {
      title: 'My Databases',
      databases,
      moment
    });
    
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error loading databases');
    res.redirect('/dashboard');
  }
};

// Get database details
exports.getDatabaseDetails = async (req, res) => {
  const { id } = req.params;
  const userId = req.session.user.id;
  
  try {
    const database = await Database.findOne({
      where: { id, userId }
    });
    
    if (!database) {
      req.flash('error_msg', 'Database not found');
      return res.redirect('/database/list');
    }
    
    // Calculate days remaining
    const daysRemaining = moment(database.expiryDate).diff(moment(), 'days');
    const isExpired = daysRemaining < 0;
    
    res.render('database/details', {
      title: `Database - ${database.domain}`,
      database,
      daysRemaining,
      isExpired,
      moment
    });
    
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error loading database details');
    res.redirect('/database/list');
  }
};

// Admin: Create database
exports.createNewDatabase = async (req, res) => {
  const { userId, domain, host, port } = req.body;
  
  try {
    // Check if user exists
    const user = await User.findByPk(userId);
    
    if (!user) {
      req.flash('error_msg', 'User not found');
      return res.redirect('/admin/databases');
    }
    
    // Generate database credentials
    const domainPrefix = domain.split('.')[0].substring(0, 5);
    const dbName = `${domainPrefix}_${nanoid(8)}`.toLowerCase();
    const dbUser = `user_${nanoid(8)}`.toLowerCase();
    const dbPassword = nanoid(12);
    
    // Create actual MySQL database
    await createDatabase(dbName, dbUser, dbPassword, path.join(__dirname, '../create.sql'));
    
    // Store database info
    const newDatabase = await Database.create({
      name: dbName,
      userId: user.id,
      username: dbUser,
      password: dbPassword,
      domain,
      host: host || 'localhost',
      port: port || 3306
    });
    
    // Send welcome email
    await sendWelcomeEmail(user, newDatabase);
    
    req.flash('success_msg', 'Database created successfully');
    res.redirect(`/admin/databases/${newDatabase.id}`);
    
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error creating database');
    res.redirect('/admin/databases');
  }
};

// Admin: Check if database name exists
exports.checkDatabaseName = async (req, res) => {
  const { name } = req.query;
  
  try {
    const exists = await checkDatabaseExists(name);
    
    res.json({ exists });
    
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error checking database name' });
  }
};
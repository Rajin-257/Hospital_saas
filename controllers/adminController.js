const { Op } = require('sequelize');
const User = require('../models/User');
const Database = require('../models/Database');
const Payment = require('../models/Payment');
const Commission = require('../models/Commission');
const { deleteDatabase, updateDatabasePassword } = require('../services/databaseService');
const moment = require('moment');
const { sendExecutiveCredentialsEmail } = require('../services/mailService');
const bcrypt = require('bcrypt');

// Admin Dashboard
exports.getDashboard = async (req, res) => {
  try {
    // Get counts
    const totalUsers = await User.count({ where: { role: 'executive' } });
    const totalDatabases = await Database.count();
    const activeDatabases = await Database.count({ 
      where: { 
        isActive: true,
        expiryDate: { [Op.gt]: new Date() }
      } 
    });
    const totalPayments = await Payment.count({ where: { status: 'completed' } });
    
    // Get recent payments
    const recentPayments = await Payment.findAll({
      where: { status: 'completed' },
      limit: 5,
      order: [['paymentDate', 'DESC']],
      include: [
        { model: User, as: 'user', attributes: ['fullName', 'email'] },
        { model: Database, as: 'database', attributes: ['name', 'domain'] }
      ]
    });
    
    // Calculate revenue
    const payments = await Payment.findAll({
      where: { status: 'completed' },
      attributes: ['amount']
    });
    
    const totalRevenue = payments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);
    
    // Get databases expiring soon
    const expiringDatabases = await Database.findAll({
      where: {
        isActive: true,
        expiryDate: {
          [Op.gt]: new Date(),
          [Op.lt]: moment().add(7, 'days').toDate()
        }
      },
      limit: 5,
      order: [['expiryDate', 'ASC']],
      include: [{ model: User, as: 'user', attributes: ['fullName', 'email'] }]
    });
    
    res.render('dashboard/admin/index', {
      title: 'Admin Dashboard',
      totalUsers,
      totalDatabases,
      activeDatabases,
      expiringDatabases,
      totalPayments,
      totalRevenue,
      recentPayments,
      moment
    });
    
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error loading dashboard data');
    res.render('dashboard/admin/index', {
      title: 'Admin Dashboard',
      totalUsers: 0,
      totalDatabases: 0,
      activeDatabases: 0,
      expiringDatabases: [],
      totalPayments: 0,
      totalRevenue: 0,
      recentPayments: [],
      moment
    });
  }
};

// User Management
exports.getUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      order: [['createdAt', 'DESC']]
    });
    
    res.render('dashboard/admin/users', {
      title: 'User Management',
      users,
      moment
    });
    
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error loading users');
    res.render('dashboard/admin/users', {
      title: 'User Management',
      users: [],
      moment
    });
  }
};

// Get user details
exports.getUserDetails = async (req, res) => {
  const { id } = req.params;
  
  try {
    const user = await User.findByPk(id);
    
    if (!user) {
      req.flash('error_msg', 'User not found');
      return res.redirect('/admin/users');
    }
    
    // Get user's databases
    const databases = await Database.findAll({ where: { userId: id } });
    
    // Get user's payments
    const payments = await Payment.findAll({ 
      where: { userId: id },
      include: [{ model: Database, as: 'database' }]
    });
    
    // Get commissions (if user is executive)
    const commissions = await Commission.findAll({ 
      where: { executiveId: id },
      include: [{ model: User, as: 'referredUser' }]
    });
    
    // Get referrals
    const referrals = await User.findAll({ where: { referredBy: id } });
    
    res.render('dashboard/admin/user-details', {
      title: `User Details - ${user.fullName}`,
      user,
      databases,
      payments,
      commissions,
      referrals,
      moment
    });
    
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error loading user details');
    res.redirect('/admin/users');
  }
};

// Update user
exports.updateUser = async (req, res) => {
  const { id } = req.params;
  const { fullName, email, phone, commissionRate, isActive, role } = req.body;
  
  try {
    const user = await User.findByPk(id);
    
    if (!user) {
      req.flash('error_msg', 'User not found');
      return res.redirect('/admin/users');
    }

    // Check if role is being changed to executive
    if (role === 'executive' && user.role !== 'executive') {
      // Generate a random password
      const tempPassword = user.storedPassword

      // Update user with new role and password
      await user.update({
        fullName,
        email,
        phone,
        commissionRate: parseFloat(commissionRate),
        isActive: isActive === 'on',
        role,
        storedPassword: ''
      });

      // Send credentials email
      await sendExecutiveCredentialsEmail(user, tempPassword);
      
      req.flash('success_msg', 'User updated and executive credentials sent');
    } else {
      // Regular update without password change
      await user.update({
        fullName,
        email,
        phone,
        commissionRate: parseFloat(commissionRate),
        isActive: isActive === 'on',
        role
      });
      
      req.flash('success_msg', 'User updated successfully');
    }
    
    res.redirect(`/admin/users/${id}`);
    
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error updating user');
    res.redirect(`/admin/users/${id}`);
  }
};

// Database Management
exports.getDatabases = async (req, res) => {
  try {
    const databases = await Database.findAll({
      order: [['createdAt', 'DESC']],
      include: [{ model: User, as: 'user', attributes: ['fullName', 'email'] }]
    });
    
    res.render('dashboard/admin/databases', {
      title: 'Database Management',
      databases,
      moment
    });
    
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error loading databases');
    res.render('dashboard/admin/databases', {
      title: 'Database Management',
      databases: [],
      moment
    });
  }
};

// Get database details
exports.getDatabaseDetails = async (req, res) => {
  const { id } = req.params;
  
  try {
    const database = await Database.findByPk(id, {
      include: [{ model: User, as: 'user' }]
    });
    
    if (!database) {
      req.flash('error_msg', 'Database not found');
      return res.redirect('/admin/databases');
    }
    
    // Get related payments
    const payments = await Payment.findAll({ 
      where: { databaseId: id },
      order: [['paymentDate', 'DESC']]
    });
    
    res.render('dashboard/admin/database-details', {
      title: `Database Details - ${database.name}`,
      database,
      payments,
      moment
    });
    
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error loading database details');
    res.redirect('/admin/databases');
  }
};

// Update database
exports.updateDatabase = async (req, res) => {
  const { id } = req.params;
  const { host, port, username, password, expiryDate, isActive } = req.body;
  
  try {
    const database = await Database.findByPk(id);
    
    if (!database) {
      req.flash('error_msg', 'Database not found');
      return res.redirect('/admin/databases');
    }
    
    // Update database password in MySQL if changed
    if (password && password !== database.password) {
      await updateDatabasePassword(database.username, password);
    }
    
    // Update database record
    await database.update({
      host,
      port: parseInt(port),
      username,
      password: password || database.password,
      expiryDate: new Date(expiryDate),
      isActive: isActive === 'on',
      moment
    });
    
    req.flash('success_msg', 'Database updated successfully');
    res.redirect(`/admin/databases/${id}`);
    
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error updating database');
    res.redirect(`/admin/databases/${id}`);
  }
};

// Delete database
exports.deleteDb = async (req, res) => {
  const { id } = req.params;
  
  try {
    const database = await Database.findByPk(id);
    
    if (!database) {
      req.flash('error_msg', 'Database not found');
      return res.redirect('/admin/databases');
    }
    
    // Delete actual MySQL database
    await deleteDatabase(database.name, database.username);
    
    // Delete database record
    await database.destroy();
    
    req.flash('success_msg', 'Database deleted successfully');
    res.redirect('/admin/databases');
    
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error deleting database');
    res.redirect('/admin/databases');
  }
};

// Payment Management
exports.getPayments = async (req, res) => {
  try {
    const payments = await Payment.findAll({
      order: [['paymentDate', 'DESC']],
      include: [
        { model: User, as: 'user', attributes: ['fullName', 'email'] },
        { model: Database, as: 'database', attributes: ['name', 'domain'] }
      ]
    });
    
    res.render('dashboard/admin/payments', {
      title: 'Payment Management',
      payments,
      moment
    });
    
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error loading payments');
    res.render('dashboard/admin/payments', {
      title: 'Payment Management',
      payments: [],
      moment
    });
  }
};

// Commission Management
exports.getCommissions = async (req, res) => {
  try {
    const commissions = await Commission.findAll({
      order: [['createdAt', 'DESC']],
      include: [
        { model: User, as: 'executive', attributes: ['fullName', 'email'] },
        { model: User, as: 'referredUser', attributes: ['fullName', 'email'] },
        { model: Payment, as: 'payment', include: [{ model: Database, as: 'database' }] }
      ]
    });
    
    // Get executives for filter
    const executives = await User.findAll({
      where: { role: 'executive' },
      attributes: ['id', 'fullName', 'email']
    });
    
    res.render('dashboard/admin/commissions', {
      title: 'Commission Management',
      commissions,
      executives,
      moment
    });
    
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error loading commissions');
    res.render('dashboard/admin/commissions', {
      title: 'Commission Management',
      commissions: [],
      executives: [],
      moment
    });
  }
};

// Update commission status
exports.updateCommission = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  try {
    const commission = await Commission.findByPk(id);
    
    if (!commission) {
      req.flash('error_msg', 'Commission not found');
      return res.redirect('/admin/commissions');
    }
    
    // Update commission
    await commission.update({
      status,
      paymentDate: status === 'paid' ? new Date() : null
    });
    
    req.flash('success_msg', 'Commission updated successfully');
    res.redirect('/admin/commissions');
    
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error updating commission');
    res.redirect('/admin/commissions');
  }
};

// Reports
exports.getReports = async (req, res) => {
  const { period } = req.query;
  let startDate, endDate;
  
  // Set period dates
  switch (period) {
    case 'today':
      startDate = moment().startOf('day').toDate();
      endDate = moment().endOf('day').toDate();
      break;
    case 'week':
      startDate = moment().startOf('week').toDate();
      endDate = moment().endOf('week').toDate();
      break;
    case 'month':
      startDate = moment().startOf('month').toDate();
      endDate = moment().endOf('month').toDate();
      break;
    case 'year':
      startDate = moment().startOf('year').toDate();
      endDate = moment().endOf('year').toDate();
      break;
    default:
      // Last 30 days default
      startDate = moment().subtract(30, 'days').startOf('day').toDate();
      endDate = moment().endOf('day').toDate();
  }
  
  try {
    // Get payments in period
    const payments = await Payment.findAll({
      where: {
        status: 'completed',
        paymentDate: {
          [Op.between]: [startDate, endDate]
        }
      },
      include: [
        { model: User, as: 'user', attributes: ['fullName', 'email'] },
        { model: Database, as: 'database', attributes: ['name', 'domain'] }
      ]
    });
    
    // Calculate revenue
    const revenue = payments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);
    
    // Get commissions in period
    const commissions = await Commission.findAll({
      where: {
        createdAt: {
          [Op.between]: [startDate, endDate]
        }
      },
      include: [{ model: User, as: 'executive', attributes: ['fullName', 'email'] }]
    });
    
    // Calculate total commissions
    const totalCommissions = commissions.reduce((sum, commission) => sum + parseFloat(commission.amount), 0);
    
    // Get new registrations in period
    const newUsers = await User.count({
      where: {
        createdAt: {
          [Op.between]: [startDate, endDate]
        }
      }
    });
    
    // Get new databases in period
    const newDatabases = await Database.count({
      where: {
        createdAt: {
          [Op.between]: [startDate, endDate]
        }
      }
    });
    
    res.render('dashboard/admin/reports', {
      title: 'Reports',
      period: period || '30days',
      startDate,
      endDate,
      payments,
      revenue,
      commissions,
      totalCommissions,
      newUsers,
      newDatabases,
      moment
    });
    
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error generating reports');
    res.render('dashboard/admin/reports', {
      title: 'Reports',
      period: period || '30days',
      startDate,
      endDate,
      payments: [],
      revenue: 0,
      commissions: [],
      totalCommissions: 0,
      newUsers: 0,
      newDatabases: 0,
      moment
    });
  }
};
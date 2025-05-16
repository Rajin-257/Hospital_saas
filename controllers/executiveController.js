const User = require('../models/User');
const Commission = require('../models/Commission');
const Payment = require('../models/Payment');
const Database = require('../models/Database');
const moment = require('moment');
const { Op } = require('sequelize');

// Executive Dashboard
exports.getDashboard = async (req, res) => {
  const userId = req.session.user.id;
  
  try {
    // Get user details
    const user = await User.findByPk(userId);
    
    // Get total commissions
    const commissions = await Commission.findAll({
      where: { executiveId: userId }
    });
    
    const totalCommission = commissions.reduce((sum, commission) => {
      return sum + parseFloat(commission.amount);
    }, 0);
    
    const pendingCommission = commissions
      .filter(c => c.status === 'pending')
      .reduce((sum, commission) => sum + parseFloat(commission.amount), 0);
    
    const paidCommission = commissions
      .filter(c => c.status === 'paid')
      .reduce((sum, commission) => sum + parseFloat(commission.amount), 0);
    
    // Get referrals
    const referrals = await User.findAll({
      where: { referredBy: userId },
      attributes: ['id', 'fullName', 'email', 'createdAt']
    });
    
    // Get recent commissions
    const recentCommissions = await Commission.findAll({
      where: { executiveId: userId },
      limit: 5,
      order: [['createdAt', 'DESC']],
      include: [
        { model: User, as: 'referredUser', attributes: ['fullName', 'email'] },
        { model: Payment, as: 'payment' }
      ]
    });
    
    res.render('dashboard/executive/index', {
      title: 'Executive Dashboard',
      user,
      totalCommission,
      pendingCommission,
      paidCommission,
      referralCount: referrals.length,
      recentCommissions,
      moment
    });
    
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error loading dashboard data');
    res.render('dashboard/executive/index', {
      title: 'Executive Dashboard',
      user: req.session.user,
      totalCommission: 0,
      pendingCommission: 0,
      paidCommission: 0,
      referralCount: 0,
      recentCommissions: [],
      moment
    });
  }
};

// Commission History
exports.getCommissions = async (req, res) => {
  const userId = req.session.user.id;
  const { status, period } = req.query;
  
  // Define date filters
  let dateFilter = {};
  if (period) {
    let startDate, endDate;
    
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
        // No date filter
        break;
    }
    
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          [Op.between]: [startDate, endDate]
        }
      };
    }
  }
  
  // Define status filter
  let statusFilter = {};
  if (status && ['pending', 'paid', 'cancelled'].includes(status)) {
    statusFilter = { status };
  }
  
  try {
    // Get commissions with filters
    const commissions = await Commission.findAll({
      where: {
        executiveId: userId,
        ...statusFilter,
        ...dateFilter
      },
      order: [['createdAt', 'DESC']],
      include: [
        { model: User, as: 'referredUser', attributes: ['fullName', 'email'] },
        { 
          model: Payment, 
          as: 'payment',
          include: [{ model: Database, as: 'database', attributes: ['name', 'domain'] }]
        }
      ]
    });
    
    // Calculate totals
    const totalAmount = commissions.reduce((sum, commission) => {
      return sum + parseFloat(commission.amount);
    }, 0);
    
    res.render('dashboard/executive/commissions', {
      title: 'Commission History',
      commissions,
      totalAmount,
      filter: {
        status: status || 'all',
        period: period || 'all'
      },
      moment
    });
    
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error loading commission history');
    res.render('dashboard/executive/commissions', {
      title: 'Commission History',
      commissions: [],
      totalAmount: 0,
      filter: {
        status: status || 'all',
        period: period || 'all'
      },
      moment
    });
  }
};

// Referrals
exports.getReferrals = async (req, res) => {
  const userId = req.session.user.id;
  
  try {
    // Get user details
    const user = await User.findByPk(userId);
    
    // Get all referrals
    const referrals = await User.findAll({
      where: { referredBy: userId },
      attributes: ['id', 'fullName', 'email', 'createdAt'],
      order: [['createdAt', 'DESC']]
    });
    
    // Get referral databases
    const referralIds = referrals.map(ref => ref.id);
    const databases = await Database.findAll({
      where: { userId: { [Op.in]: referralIds } },
      include: [{ model: User, as: 'user', attributes: ['id', 'fullName', 'email'] }]
    });
    
    // Get payments made by referrals
    const payments = await Payment.findAll({
      where: { userId: { [Op.in]: referralIds }, status: 'completed' },
      include: [
        { model: User, as: 'user', attributes: ['id', 'fullName', 'email'] },
        { model: Database, as: 'database', attributes: ['name', 'domain'] }
      ]
    });
    
    // Get commissions earned from referrals
    const commissions = await Commission.findAll({
      where: { 
        executiveId: userId,
        referredUserId: { [Op.in]: referralIds }
      },
      include: [{ model: User, as: 'referredUser', attributes: ['id', 'fullName', 'email'] }]
    });
    
    res.render('dashboard/executive/referrals', {
      title: 'My Referrals',
      user,
      referrals,
      databases,
      payments,
      commissions,
      referralCode: user.referralCode,
      moment
    });
    
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error loading referral data');
    res.render('dashboard/executive/referrals', {
      title: 'My Referrals',
      user: req.session.user,
      referrals: [],
      databases: [],
      payments: [],
      commissions: [],
      referralCode: req.session.user.referralCode,
      moment
    });
  }
};

// Profile
exports.getProfile = async (req, res) => {
  const userId = req.session.user.id;
  
  try {
    const user = await User.findByPk(userId);
    
    res.render('dashboard/executive/profile', {
      title: 'My Profile',
      user,
      moment
    });
    
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error loading profile');
    res.redirect('/executive/dashboard');
  }
};

// Update profile
exports.updateProfile = async (req, res) => {
  const userId = req.session.user.id;
  const { fullName, email, phone, currentPassword, newPassword, confirmPassword } = req.body;
  
  try {
    const user = await User.findByPk(userId);
    
    // Verify current password if changing password
    if (newPassword) {
      const isMatch = await user.isValidPassword(currentPassword);
      
      if (!isMatch) {
        req.flash('error_msg', 'Current password is incorrect');
        return res.redirect('/executive/profile');
      }
      
      if (newPassword !== confirmPassword) {
        req.flash('error_msg', 'New passwords do not match');
        return res.redirect('/executive/profile');
      }
    }
    
    // Update user
    const updateData = {
      fullName,
      email,
      phone
    };
    
    if (newPassword) {
      updateData.password = newPassword;
    }
    
    await user.update(updateData);
    
    // Update session
    req.session.user.fullName = user.fullName;
    req.session.user.email = user.email;
    
    req.flash('success_msg', 'Profile updated successfully');
    res.redirect('/executive/profile');
    
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error updating profile');
    res.redirect('/executive/profile');
  }
};
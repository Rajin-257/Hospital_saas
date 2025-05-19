const User = require('../models/User');
const Database = require('../models/Database');
const Payment = require('../models/Payment');
const Commission = require('../models/Commission');
const { sendPaymentConfirmationEmail, sendCommissionEmail } = require('../services/mailService');
const moment = require('moment');
const { v4: uuidv4 } = require('uuid');

// Get subscription page
exports.getSubscription = async (req, res) => {
  const { databaseId } = req.query;
  const userId = req.session.user.id;
  
  try {
    // Get user
    const user = await User.findByPk(userId);
    
    // Get database
    let database;
    if (databaseId) {
      database = await Database.findOne({ 
        where: { id: databaseId, userId } 
      });
      
      if (!database) {
        req.flash('error_msg', 'Database not found');
        return res.redirect('/dashboard');
      }
    } else {
      // Get first database for this user if no specific id provided
      database = await Database.findOne({ where: { userId } });
      
      if (!database) {
        req.flash('error_msg', 'You don\'t have any databases yet');
        return res.redirect('/dashboard');
      }
    }
    
    // Calculate days remaining
    const daysRemaining = moment(database.expiryDate).diff(moment(), 'days');
    
    // Get subscription price (default 1000 BDT)
    // In a real app, this might come from a settings/pricing table
    const subscriptionPrice = 1000;
    
    res.render('payment/subscription', {
      title: 'Extend Subscription',
      user,
      database,
      daysRemaining,
      subscriptionPrice,
      moment
    });
    
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error loading subscription page');
    res.redirect('/dashboard');
  }
};

// Get checkout page
exports.getCheckout = async (req, res) => {
  const { databaseId } = req.query;
  const userId = req.session.user.id;
  
  try {
    // Get user
    const user = await User.findByPk(userId);
    
    // Get database
    const database = await Database.findOne({ 
      where: { id: databaseId, userId } 
    });
    
    if (!database) {
      req.flash('error_msg', 'Database not found');
      return res.redirect('/payment/subscription');
    }
    
    // Get price (default 1000 BDT)
    const amount = 1000;
    
    res.render('payment/checkout', {
      title: 'Checkout',
      user,
      database,
      amount,
      transactionId: `TRX-${uuidv4().substring(0, 8).toUpperCase()}`,
      paymentMethods: [
        { id: 'bkash', name: 'bKash', icon: 'bkash.png' },
        { id: 'nagad', name: 'Nagad', icon: 'nagad.png' },
        { id: 'rocket', name: 'Rocket', icon: 'rocket.png' },
        { id: 'card', name: 'Credit/Debit Card', icon: 'card.png' }
      ]
    });
    
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error loading checkout page');
    res.redirect('/payment/subscription');
  }
};

// Process payment
exports.processPayment = async (req, res) => {
  const { databaseId, amount, paymentMethod, transactionId, yourName, yourEmail } = req.body;
  let userId;
  
  try {
    // Check if the request is from a logged-in user or public
    const isPublicPayment = !!yourName && !!yourEmail;
    
    // Get database
    const database = await Database.findByPk(databaseId);
    
    if (!database) {
      req.flash('error_msg', 'Database not found');
      return res.redirect('/payment/subscription');
    }
    
    if (isPublicPayment) {
      // Public payment
      userId = database.userId; // Use the database owner's ID
    } else {
      // Regular user payment
      userId = req.session.user.id;
      
      // Verify the database belongs to the user
      if (database.userId !== userId) {
        req.flash('error_msg', 'You do not have permission to extend this database');
        return res.redirect('/payment/subscription');
      }
    }
    
    // Get user (database owner)
    const user = await User.findByPk(userId);
    
    // Create payment record
    const payment = await Payment.create({
      userId,
      databaseId,
      amount,
      paymentMethod,
      transactionId,
      status: 'completed', // In a real app, this would be 'pending' until verified
      extensionDays: 30, // 30 days extension
      customerName: yourName || user.name,
      customerEmail: yourEmail || user.email
    });
    
    // Update database expiry
    const newExpiryDate = moment(database.expiryDate).isAfter(moment()) ?
      moment(database.expiryDate).add(30, 'days').toDate() :
      moment().add(30, 'days').toDate();
    
    await database.update({
      expiryDate: newExpiryDate,
      type: 'paid',
      isActive: true
    });
    
    // Process commission if user was referred
    if (user.referredBy) {
      const executive = await User.findByPk(user.referredBy);
      
      if (executive && executive.isActive) {
        const commissionRate = executive.commissionRate || 10; // Default 10% if not set
        const commissionAmount = (parseFloat(amount) * commissionRate) / 100;
        
        // Create commission record
        const commission = await Commission.create({
          executiveId: executive.id,
          paymentId: payment.id,
          referredUserId: userId,
          amount: commissionAmount,
          percentage: commissionRate,
          status: 'pending'
        });
        
        // Update payment with commission info
        await payment.update({
          referralCommission: commissionAmount,
          referredById: executive.id
        });
        
        // Send commission notification
        await sendCommissionEmail(executive, commission, payment);
      }
    }
    
    // Send payment confirmation email to database owner
    await sendPaymentConfirmationEmail(user, payment, database);
    
    // Also send confirmation to customer if it's a public payment
    if (isPublicPayment && yourEmail) {
      await sendPaymentConfirmationEmail({ name: yourName, email: yourEmail }, payment, database);
    }
    
    req.flash('success_msg', 'Payment successful! The subscription has been extended.');
    res.redirect('/payment/success');
    
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error processing payment');
    res.redirect('/payment/subscription');
  }
};

// Payment success page
exports.getPaymentSuccess = async (req, res) => {
  // Check if user is logged in
  const user = req.session && req.session.user ? req.session.user : null;
  
  res.render('payment/success', {
    title: 'Payment Successful',
    user
  });
};

// Get payment history
exports.getPaymentHistory = async (req, res) => {
  const userId = req.session.user.id;
  
  try {
    const payments = await Payment.findAll({
      where: { userId },
      order: [['paymentDate', 'DESC']],
      include: [{ model: Database, as: 'database' }]
    });
    
    res.render('payment/history', {
      title: 'Payment History',
      payments,
      moment
    });
    
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error loading payment history');
    res.redirect('/dashboard');
  }
};

// Admin: Update payment settings
exports.updatePaymentSettings = async (req, res) => {
  const { defaultAmount } = req.body;
  
  // In a real app, this would update settings in a database
  // Here we'll just redirect with success message
  
  req.flash('success_msg', 'Payment settings updated successfully');
  res.redirect('/admin/settings');
};

// Public checkout page with database ID from external sources
exports.getPublicCheakout = async (req, res) => {
  const { id } = req.params;
  
  try {
    // Get database by ID
    const database = await Database.findByPk(id);
    
    if (!database) {
      return res.status(404).render('errors/404', {
        title: 'Database Not Found',
        message: 'The requested database could not be found.'
      });
    }
    
    // Get database owner
    const user = await User.findByPk(database.userId);
    
    // Get price (default 1000 BDT)
    const amount = 1000;
    
    res.render('payment/public-checkout', {
      title: 'Checkout',
      database,
      amount,
      transactionId: `TRX-${uuidv4().substring(0, 8).toUpperCase()}`,
      paymentMethods: [
        { id: 'bkash', name: 'bKash', icon: 'bkash.png' },
        { id: 'nagad', name: 'Nagad', icon: 'nagad.png' },
        { id: 'rocket', name: 'Rocket', icon: 'rocket.png' },
        { id: 'card', name: 'Credit/Debit Card', icon: 'card.png' }
      ]
    });
    
  } catch (err) {
    console.error(err);
    res.status(500).render('errors/500', {
      title: 'Server Error',
      message: 'There was an error processing your request.'
    });
  }
};
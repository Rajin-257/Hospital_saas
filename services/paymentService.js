const Payment = require('../models/Payment');
const Database = require('../models/Database');
const User = require('../models/User');
const Commission = require('../models/Commission');
const Referral = require('../models/Referral');
const { sendPaymentConfirmationEmail, sendCommissionEmail } = require('./mailService');
const moment = require('moment');
const { v4: uuidv4 } = require('uuid');

/**
 * Payment Service
 * Handles payment processing and related operations
 */
class PaymentService {
  /**
   * Create a new payment record
   * @param {Object} paymentData - Payment data
   * @returns {Promise<Object>} Created payment
   */
  async createPayment(paymentData) {
    try {
      // Create payment record
      const payment = await Payment.create({
        userId: paymentData.userId,
        databaseId: paymentData.databaseId,
        amount: paymentData.amount,
        paymentMethod: paymentData.paymentMethod,
        transactionId: paymentData.transactionId || `TRX-${uuidv4().substring(0, 8).toUpperCase()}`,
        status: 'pending', // Initial status is pending
        extensionDays: paymentData.extensionDays || 30
      });
      
      return payment;
    } catch (error) {
      console.error('Error creating payment:', error);
      throw error;
    }
  }
  
  /**
   * Process payment and update related records
   * @param {Object} payment - Payment object
   * @returns {Promise<Object>} Updated payment
   */
  async processPayment(payment) {
    try {
      // In a real-world scenario, you would integrate with a payment gateway here
      // This is a simplified implementation for demo purposes
      
      // Verify payment with payment gateway
      const isVerified = await this.verifyPayment(payment.transactionId, payment.amount);
      
      if (!isVerified) {
        await payment.update({ status: 'failed' });
        throw new Error('Payment verification failed');
      }
      
      // Mark payment as completed
      await payment.update({ status: 'completed' });
      
      // Get database and update expiry date
      const database = await Database.findByPk(payment.databaseId);
      if (!database) {
        throw new Error('Database not found');
      }
      
      // Calculate new expiry date
      const newExpiryDate = moment(database.expiryDate).isAfter(moment()) ?
        moment(database.expiryDate).add(payment.extensionDays, 'days').toDate() :
        moment().add(payment.extensionDays, 'days').toDate();
      
      // Update database
      await database.update({
        expiryDate: newExpiryDate,
        type: 'paid',
        isActive: true
      });
      
      // Get user
      const user = await User.findByPk(payment.userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      // Process referral commissions if applicable
      if (user.referredBy) {
        await this.processCommission(payment, user);
      }
      
      // Send payment confirmation email
      await sendPaymentConfirmationEmail(user, payment, database);
      
      return payment;
    } catch (error) {
      console.error('Error processing payment:', error);
      throw error;
    }
  }
  
  /**
   * Process commission for a referral
   * @param {Object} payment - Payment object
   * @param {Object} user - User who made the payment
   * @returns {Promise<Object>} Created commission
   */
  async processCommission(payment, user) {
    try {
      // Get referring user (executive)
      const executive = await User.findByPk(user.referredBy);
      
      if (!executive || !executive.isActive) {
        console.warn('Referring user not found or inactive:', user.referredBy);
        return null;
      }
      
      // Get or create referral record
      let referral = await Referral.findOne({
        where: {
          referrerId: executive.id,
          referredId: user.id
        }
      });
      
      if (!referral) {
        referral = await Referral.create({
          referrerId: executive.id,
          referredId: user.id,
          referralCode: executive.referralCode,
          status: 'active',
          activatedAt: new Date()
        });
      }
      
      // Calculate commission amount
      const commissionRate = executive.commissionRate || 10; // Default 10% if not set
      const commissionAmount = (parseFloat(payment.amount) * commissionRate) / 100;
      
      // Create commission record
      const commission = await Commission.create({
        executiveId: executive.id,
        paymentId: payment.id,
        referredUserId: user.id,
        referralId: referral.id,
        amount: commissionAmount,
        percentage: commissionRate,
        status: 'pending'
      });
      
      // Update payment with commission info
      await payment.update({
        referralCommission: commissionAmount,
        referredById: executive.id
      });
      
      // If this is the first payment, mark referral as completed
      if (referral.status !== 'completed') {
        await referral.complete(payment.id);
      }
      
      // Send commission notification
      await sendCommissionEmail(executive, commission, payment);
      
      return commission;
    } catch (error) {
      console.error('Error processing commission:', error);
      throw error;
    }
  }
  
  /**
   * Verify payment with payment gateway
   * @param {string} transactionId - Transaction ID
   * @param {number} amount - Payment amount
   * @returns {Promise<boolean>} Verification result
   */
  async verifyPayment(transactionId, amount) {
    try {
      // In a real-world scenario, you would call the payment gateway API here
      // This is a simplified implementation for demo purposes
      
      // Simulate verification delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // For demo purposes, all payments with transaction IDs are considered verified
      return !!transactionId;
    } catch (error) {
      console.error('Error verifying payment:', error);
      return false;
    }
  }
  
  /**
   * Get payment methods
   * @returns {Array} Available payment methods
   */
  getPaymentMethods() {
    return [
      { id: 'bkash', name: 'bKash', icon: 'bkash.png' },
      { id: 'nagad', name: 'Nagad', icon: 'nagad.png' },
      { id: 'rocket', name: 'Rocket', icon: 'rocket.png' },
      { id: 'card', name: 'Credit/Debit Card', icon: 'card.png' }
    ];
  }
  
  /**
   * Calculate subscription price
   * @param {Object} database - Database object
   * @param {number} days - Subscription days
   * @returns {number} Subscription price
   */
  calculateSubscriptionPrice(database, days = 30) {
    // Base price is 1000 BDT for 30 days
    const basePrice = 1000;
    
    // Calculate price based on days
    if (days === 30) {
      return basePrice;
    } else if (days === 90) {
      // 10% discount for 3 months
      return basePrice * 3 * 0.9;
    } else if (days === 180) {
      // 15% discount for 6 months
      return basePrice * 6 * 0.85;
    } else if (days === 365) {
      // 20% discount for 1 year
      return basePrice * 12 * 0.8;
    }
    
    // Custom days calculation
    return (basePrice / 30) * days;
  }
  
  /**
   * Get payment history for a user
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Payment history
   */
  async getPaymentHistory(userId, options = {}) {
    try {
      const query = {
        where: { userId },
        order: [['paymentDate', 'DESC']],
        include: [{ model: Database, as: 'database' }]
      };
      
      // Apply additional options
      if (options.limit) {
        query.limit = options.limit;
      }
      
      if (options.status) {
        query.where.status = options.status;
      }
      
      return await Payment.findAll(query);
    } catch (error) {
      console.error('Error getting payment history:', error);
      throw error;
    }
  }
}

module.exports = new PaymentService();
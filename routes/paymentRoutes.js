const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

// Subscription page
router.get('/subscription', paymentController.getSubscription);

// Checkout page
router.get('/checkout', paymentController.getCheckout);

// Process payment
router.post('/process', paymentController.processPayment);

// Payment success page
router.get('/success', paymentController.getPaymentSuccess);

// Payment history
router.get('/history', paymentController.getPaymentHistory);

router.get('/public/subscription/:id', paymentController.getPublicCheakout);

module.exports = router;
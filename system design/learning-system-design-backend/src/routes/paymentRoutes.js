const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { auth } = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// Get all payments
router.get('/', paymentController.getPayments);

// Get single payment
router.get('/:id', paymentController.getPayment);

// Get payments for specific invoice
router.get('/invoice/:invoiceId', paymentController.getInvoicePayments);

// Record new payment
router.post('/', paymentController.recordPayment);

// Update payment
router.put('/:id', paymentController.updatePayment);

// Delete payment
router.delete('/:id', paymentController.deletePayment);

module.exports = router;

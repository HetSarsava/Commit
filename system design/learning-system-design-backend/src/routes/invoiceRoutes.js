const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const { auth } = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// Get all invoices
router.get('/', invoiceController.getInvoices);

// Get single invoice
router.get('/:id', invoiceController.getInvoice);

// Create invoice from order
router.post('/from-order', invoiceController.createInvoiceFromOrder);

// Update invoice
router.put('/:id', invoiceController.updateInvoice);

// Delete invoice
router.delete('/:id', invoiceController.deleteInvoice);

module.exports = router;

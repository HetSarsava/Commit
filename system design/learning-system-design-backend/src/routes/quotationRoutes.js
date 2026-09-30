const express = require('express');
const router = express.Router();
const quotationController = require('../controllers/quotationController');
const { auth, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// Statistics
router.get('/stats', quotationController.getQuotationStats);

// CRUD operations
router.post('/', authorize('ADMIN', 'SALES'), quotationController.createQuotation);
router.get('/', quotationController.getQuotations);
router.get('/:id', quotationController.getQuotation);
router.put('/:id', authorize('ADMIN', 'SALES'), quotationController.updateQuotation);
router.delete('/:id', authorize('ADMIN'), quotationController.deleteQuotation);

module.exports = router;

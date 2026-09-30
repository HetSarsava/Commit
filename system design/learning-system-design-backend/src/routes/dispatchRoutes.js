const express = require('express');
const router = express.Router();
const dispatchController = require('../controllers/dispatchController');
const { auth, requireRole } = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// Get dispatch summary (accessible to Admin, Production, Sales)
router.get('/summary', dispatchController.getDispatchSummary);

// Get ready-to-dispatch production orders (Admin, Production)
router.get('/ready', requireRole(['ADMIN', 'PRODUCTION']), dispatchController.getReadyToDispatch);

// Get all dispatches (Admin, Production, Sales, Accountant)
router.get('/', requireRole(['ADMIN', 'PRODUCTION', 'SALES', 'ACCOUNTANT']), dispatchController.getAllDispatches);

// Get dispatches by customer (Admin, Sales)
router.get('/customer/:customerId', requireRole(['ADMIN', 'SALES']), dispatchController.getCustomerDispatches);

// Get dispatch by ID
router.get('/:id', dispatchController.getDispatchById);

// Create dispatch (Admin, Production)
router.post('/', requireRole(['ADMIN', 'PRODUCTION']), dispatchController.createDispatch);

// Update dispatch status (Admin, Production)
router.patch('/:id/status', requireRole(['ADMIN', 'PRODUCTION']), dispatchController.updateDispatchStatus);

module.exports = router;

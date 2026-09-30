const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const orderController = require('../controllers/orderController');

// All routes require authentication
router.use(auth);

// Get statistics
router.get('/stats', orderController.getOrderStats);

// CRUD routes
router.get('/', orderController.getOrders);
router.get('/:id', orderController.getOrder);
router.post('/', orderController.createOrder);
router.post('/from-quotation', orderController.createOrderFromQuotation);
router.put('/:id', orderController.updateOrder);
router.delete('/:id', orderController.deleteOrder);

module.exports = router;

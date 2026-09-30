const express = require('express');
const router = express.Router();
const productionController = require('../controllers/productionController');
const { auth } = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// Get all production items
router.get('/', productionController.getProductionBoard);

// Get production board
router.get('/board', productionController.getProductionBoard);

// Get production for specific order
router.get('/order/:orderId', productionController.getOrderProduction);

// Create production tracking
router.post('/', productionController.createProductionTracking);

// Update production stage
router.put('/:id', productionController.updateProductionStage);

// Bulk move to next stage
router.post('/bulk-move', productionController.bulkMoveToNextStage);

// Delete production tracking
router.delete('/:id', productionController.deleteProductionTracking);

module.exports = router;

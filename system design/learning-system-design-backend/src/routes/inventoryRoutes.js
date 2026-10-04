const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const { auth, requireRole } = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// Material routes (Admin, Purchase role)
router.get('/materials', inventoryController.getAllMaterials);
router.get('/materials/low-stock', inventoryController.getLowStock);
router.get('/materials/:id', inventoryController.getMaterialById);
router.post('/materials', requireRole(['ADMIN', 'PURCHASE']), inventoryController.createMaterial);
router.put('/materials/:id', requireRole(['ADMIN', 'PURCHASE']), inventoryController.updateMaterial);
router.delete('/materials/:id', requireRole(['ADMIN']), inventoryController.deleteMaterial);

// Stock movement routes
router.get('/stock-movements', inventoryController.getStockMovements);
router.post('/stock-movements', requireRole(['ADMIN', 'PURCHASE', 'PRODUCTION']), inventoryController.recordStockMovement);

// Summary/dashboard
router.get('/summary', inventoryController.getInventorySummary);

module.exports = router;

const express = require('express');
const router = express.Router();
const purchaseController = require('../controllers/purchaseController');
const { auth, requireRole } = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// Supplier routes (Admin, Purchase role)
router.get('/suppliers', purchaseController.getAllSuppliers);
router.post('/suppliers', requireRole(['ADMIN', 'PURCHASE']), purchaseController.createSupplier);
router.put('/suppliers/:id', requireRole(['ADMIN', 'PURCHASE']), purchaseController.updateSupplier);

// Purchase order routes
router.get('/purchase-orders', purchaseController.getAllPurchaseOrders);
router.get('/purchase-orders/:id', purchaseController.getPurchaseOrderById);
router.post('/purchase-orders', requireRole(['ADMIN', 'PURCHASE']), purchaseController.createPurchaseOrder);
router.patch('/purchase-orders/:id/status', requireRole(['ADMIN', 'PURCHASE']), purchaseController.updatePurchaseOrderStatus);
router.post('/purchase-orders/:id/receive', requireRole(['ADMIN', 'PURCHASE']), purchaseController.recordMaterialReceived);

// Summary/dashboard
router.get('/summary', purchaseController.getPurchaseSummary);

module.exports = router;

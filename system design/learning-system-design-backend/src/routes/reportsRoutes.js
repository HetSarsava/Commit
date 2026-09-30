const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reportsController');
const { auth } = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// Sales report
router.get('/sales', reportsController.getSalesReport);

// Product performance report
router.get('/products', reportsController.getProductReport);

// Customer report
router.get('/customers', reportsController.getCustomerReport);

// GST report
router.get('/gst', reportsController.getGSTReport);

// Payment collection report
router.get('/payments', reportsController.getPaymentReport);

// ==================== EXPORT ROUTES ====================

// Export sales report
router.get('/export/sales', reportsController.exportSalesReport);

// Export leads report
router.get('/export/leads', reportsController.exportLeadsReport);

// Export inventory report
router.get('/export/inventory', reportsController.exportInventoryReport);

// Export production report
router.get('/export/production', reportsController.exportProductionReport);

// Export marketing report
router.get('/export/marketing', reportsController.exportMarketingReport);

module.exports = router;

const express = require('express');
const router = express.Router();
const catalogueController = require('../controllers/catalogueController');
const { auth, requireRole } = require('../middleware/auth');

// Public route - get catalogue by share link
router.get('/share/:shareLink', catalogueController.getCatalogueByLink);

// Track analytics (public)
router.post('/track/click', catalogueController.trackProductClick);
router.post('/track/enquiry', catalogueController.trackEnquiryClick);

// All other routes require authentication
router.use(auth);

// Catalogue routes
router.get('/', catalogueController.getAllCatalogues);
router.get('/summary', catalogueController.getCatalogueSummary);
router.get('/:id', catalogueController.getCatalogueById);
router.get('/:id/analytics', catalogueController.getCatalogueAnalytics);
router.post('/', requireRole(['Admin', 'Sales']), catalogueController.createCatalogue);
router.patch('/:id/status', requireRole(['Admin', 'Sales']), catalogueController.updateCatalogueStatus);
router.delete('/:id', requireRole(['Admin']), catalogueController.deleteCatalogue);

module.exports = router;

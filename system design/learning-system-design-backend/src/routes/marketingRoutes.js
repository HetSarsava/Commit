const express = require('express');
const router = express.Router();
const marketingController = require('../controllers/marketingController');
const { auth, requireRole } = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// Dashboard (ADMIN, MARKETING, SALES can view)
router.get('/dashboard', requireRole(['ADMIN', 'MARKETING', 'SALES']), marketingController.getMarketingDashboard);

// Campaign CRUD (ADMIN & MARKETING role)
router.get('/', requireRole(['ADMIN', 'MARKETING']), marketingController.getAllCampaigns);
router.get('/:id', requireRole(['ADMIN', 'MARKETING']), marketingController.getCampaignById);
router.post('/', requireRole(['ADMIN', 'MARKETING']), marketingController.createCampaign);
router.put('/:id', requireRole(['ADMIN', 'MARKETING']), marketingController.updateCampaign);
router.delete('/:id', requireRole(['ADMIN']), marketingController.deleteCampaign);

// Record spend
router.post('/:id/spend', requireRole(['ADMIN', 'MARKETING']), marketingController.recordSpend);

module.exports = router;

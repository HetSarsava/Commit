const express = require('express');
const router = express.Router();
const leadController = require('../controllers/leadController');
const { auth, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// Lead statistics
router.get('/stats', leadController.getLeadStats);
router.get('/analytics/pipeline-funnel', leadController.getPipelineFunnel);
router.get('/analytics/source-performance', leadController.getSourcePerformance);
router.get('/analytics/salesperson-performance', leadController.getSalespersonPerformance);

// CRUD operations
router.post('/', leadController.createLead);
router.get('/', leadController.getLeads);
router.get('/:id', leadController.getLead);
router.put('/:id', leadController.updateLead);
router.delete('/:id', authorize('ADMIN'), leadController.deleteLead);

module.exports = router;

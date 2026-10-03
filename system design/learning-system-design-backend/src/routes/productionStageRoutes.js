const express = require('express');
const router = express.Router();
const productionStageController = require('../controllers/productionStageController');
const { auth, requireRole } = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// Production stage routes (Admin & Production role)
router.get('/:orderId/stages', productionStageController.getProductionStages);
router.get('/:productionId/timeline', productionStageController.getProductionTimeline);
router.post('/initialize', requireRole(['ADMIN', 'PRODUCTION']), productionStageController.initializeStages);
router.patch('/stages/:id/progress', requireRole(['ADMIN', 'PRODUCTION']), productionStageController.updateStageProgress);
router.patch('/stages/:id/start', requireRole(['ADMIN', 'PRODUCTION']), productionStageController.startStage);
router.patch('/stages/:id/complete', requireRole(['ADMIN', 'PRODUCTION']), productionStageController.completeStage);
router.post('/material-consumption', requireRole(['ADMIN', 'PRODUCTION']), productionStageController.recordMaterialConsumption);

module.exports = router;

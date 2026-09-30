const express = require('express');
const router = express.Router();
const productionStageController = require('../controllers/productionStageController');
const { auth, requireRole } = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// Production stage routes (Admin & Production role)
router.get('/:orderId/stages', productionStageController.getProductionStages);
router.get('/:productionId/timeline', productionStageController.getProductionTimeline);
router.post('/initialize', requireRole(['Admin', 'Production']), productionStageController.initializeStages);
router.patch('/stages/:id/progress', requireRole(['Admin', 'Production']), productionStageController.updateStageProgress);
router.patch('/stages/:id/start', requireRole(['Admin', 'Production']), productionStageController.startStage);
router.patch('/stages/:id/complete', requireRole(['Admin', 'Production']), productionStageController.completeStage);
router.post('/material-consumption', requireRole(['Admin', 'Production']), productionStageController.recordMaterialConsumption);

module.exports = router;

const express = require('express');
const router = express.Router();
const activityLogController = require('../controllers/activityLogController');
const { auth, requireRole } = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// Get all activity logs with filters (Admin and Accountant can view all)
router.get(
  '/',
  requireRole(['ADMIN', 'ACCOUNTANT']),
  activityLogController.getAllLogs
);

// Get activity statistics (Admin and Accountant)
router.get(
  '/stats',
  requireRole(['ADMIN', 'ACCOUNTANT']),
  activityLogController.getActivityStats
);

// Get logs for specific entity (any authenticated user can view their own entity logs)
router.get('/entity/:entityType/:entityId', activityLogController.getEntityLogs);

// Get activity for specific user
router.get('/user/:userId', activityLogController.getUserActivity);

// Delete old logs (Admin only)
router.delete(
  '/cleanup',
  requireRole(['ADMIN']),
  activityLogController.deleteOldLogs
);

module.exports = router;

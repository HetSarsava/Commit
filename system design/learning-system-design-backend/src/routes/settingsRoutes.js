const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { auth, requireRole } = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// Get all settings (any authenticated user can view)
router.get('/', settingsController.getAllSettings);

// Get settings by category
router.get('/category/:category', settingsController.getSettingsByCategory);

// Get single setting by key
router.get('/:key', settingsController.getSettingByKey);

// Update settings - bulk update (Admin only)
router.put('/', requireRole(['ADMIN']), settingsController.updateSettings);

// Update single setting (Admin only)
router.put('/:key', requireRole(['ADMIN']), settingsController.updateSetting);

// Reset settings to defaults (Admin only)
router.post('/reset', requireRole(['ADMIN']), settingsController.resetSettings);

// Export settings for backup (Admin only)
router.get('/export/backup', requireRole(['ADMIN']), settingsController.exportSettings);

// Import settings from backup (Admin only)
router.post('/import', requireRole(['ADMIN']), settingsController.importSettings);

module.exports = router;

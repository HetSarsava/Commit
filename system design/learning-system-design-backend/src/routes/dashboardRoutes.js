const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { auth } = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// Get dashboard statistics
router.get('/stats', dashboardController.getDashboardStats);

module.exports = router;

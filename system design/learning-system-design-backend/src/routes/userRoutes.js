const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { auth, requireRole } = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// Current user profile routes (any authenticated user)
router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);

// User management routes (ADMIN only)
router.get('/', requireRole(['ADMIN']), userController.getAllUsers);
router.get('/:id', requireRole(['ADMIN']), userController.getUserById);
router.post('/', requireRole(['ADMIN']), userController.createUser);
router.put('/:id', requireRole(['ADMIN']), userController.updateUser);
router.delete('/:id', requireRole(['ADMIN']), userController.deleteUser);

// Password update (user can update own, admin can update any)
router.put('/:id/password', userController.updatePassword);

module.exports = router;

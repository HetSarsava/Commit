const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { auth, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// Product statistics
router.get('/stats', productController.getProductStats);

// CRUD operations
router.post('/', authorize('ADMIN', 'SALES'), productController.createProduct);
router.get('/', productController.getProducts);
router.get('/:id', productController.getProduct);
router.put('/:id', authorize('ADMIN', 'SALES'), productController.updateProduct);
router.delete('/:id', authorize('ADMIN'), productController.deleteProduct);

module.exports = router;

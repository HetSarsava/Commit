const express = require('express');
const router = express.Router();
const proformaController = require('../controllers/proformaController');
const { auth, requireRole } = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// Proforma invoice routes
router.get('/', proformaController.getAllProformas);
router.get('/summary', proformaController.getProformaSummary);
router.get('/:id', proformaController.getProformaById);
router.post('/from-quotation', requireRole(['ADMIN', 'SALES', 'ACCOUNTANT']), proformaController.createFromQuotation);
router.post('/', requireRole(['ADMIN', 'SALES', 'ACCOUNTANT']), proformaController.createProforma);
router.patch('/:id/status', requireRole(['ADMIN', 'SALES']), proformaController.updateProformaStatus);
router.post('/:id/convert-to-order', requireRole(['ADMIN', 'SALES']), proformaController.convertToOrder);
router.delete('/:id', requireRole(['ADMIN']), proformaController.deleteProforma);

module.exports = router;

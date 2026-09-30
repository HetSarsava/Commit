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
router.post('/from-quotation', requireRole(['Admin', 'Sales', 'Accountant']), proformaController.createFromQuotation);
router.post('/', requireRole(['Admin', 'Sales', 'Accountant']), proformaController.createProforma);
router.patch('/:id/status', requireRole(['Admin', 'Sales']), proformaController.updateProformaStatus);
router.post('/:id/convert-to-order', requireRole(['Admin', 'Sales']), proformaController.convertToOrder);
router.delete('/:id', requireRole(['Admin']), proformaController.deleteProforma);

module.exports = router;

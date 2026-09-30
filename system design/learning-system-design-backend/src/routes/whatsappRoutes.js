const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsappController');
const { auth } = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// ==================== CONVERSATIONS ====================

// Get all conversations
router.get('/conversations', whatsappController.getConversations);

// Get messages for a conversation
router.get('/conversations/:conversationId/messages', whatsappController.getMessages);

// Send a message
router.post('/send', whatsappController.sendMessage);

// ==================== TEMPLATES ====================

// Get all templates
router.get('/templates', whatsappController.getTemplates);

// ==================== AUTOMATIONS ====================

// Get all automations
router.get('/automations', whatsappController.getAutomations);

// Toggle automation on/off
router.put('/automations/:id/toggle', whatsappController.toggleAutomation);

// ==================== ANALYTICS ====================

// Get WhatsApp analytics
router.get('/analytics', whatsappController.getAnalytics);

// ==================== LEGACY ENDPOINTS ====================

// Get message history
router.get('/messages', whatsappController.getMessageHistory);

// Send quotation
router.post('/send-quotation', whatsappController.sendQuotation);

// Send order confirmation
router.post('/send-order-confirmation', whatsappController.sendOrderConfirmation);

// Send payment reminder
router.post('/send-payment-reminder', whatsappController.sendPaymentReminder);

module.exports = router;

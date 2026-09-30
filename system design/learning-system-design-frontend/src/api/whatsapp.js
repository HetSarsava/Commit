import apiClient from './client';

export const whatsappAPI = {
  // ==================== CONVERSATIONS ====================

  // Get all conversations
  getConversations: async () => {
    const response = await apiClient.get('/whatsapp/conversations');
    return response.data;
  },

  // Get messages for a conversation
  getMessages: async (conversationId) => {
    const response = await apiClient.get(`/whatsapp/conversations/${conversationId}/messages`);
    return response.data;
  },

  // Send a message
  sendMessage: async (data) => {
    const response = await apiClient.post('/whatsapp/send', data);
    return response.data;
  },

  // Mark conversation as read
  markAsRead: async (conversationId) => {
    const response = await apiClient.put(`/whatsapp/conversations/${conversationId}/read`);
    return response.data;
  },

  // Create conversation (start new chat)
  createConversation: async (data) => {
    const response = await apiClient.post('/whatsapp/conversations', data);
    return response.data;
  },

  // ==================== TEMPLATES ====================

  // Get all message templates
  getTemplates: async () => {
    const response = await apiClient.get('/whatsapp/templates');
    return response.data;
  },

  // Create new template
  createTemplate: async (data) => {
    const response = await apiClient.post('/whatsapp/templates', data);
    return response.data;
  },

  // Update template
  updateTemplate: async (id, data) => {
    const response = await apiClient.put(`/whatsapp/templates/${id}`, data);
    return response.data;
  },

  // Delete template
  deleteTemplate: async (id) => {
    const response = await apiClient.delete(`/whatsapp/templates/${id}`);
    return response.data;
  },

  // Send template message
  sendTemplate: async (data) => {
    const response = await apiClient.post('/whatsapp/send-template', data);
    return response.data;
  },

  // ==================== AUTOMATIONS ====================

  // Get all automations
  getAutomations: async () => {
    const response = await apiClient.get('/whatsapp/automations');
    return response.data;
  },

  // Create new automation
  createAutomation: async (data) => {
    const response = await apiClient.post('/whatsapp/automations', data);
    return response.data;
  },

  // Update automation
  updateAutomation: async (id, data) => {
    const response = await apiClient.put(`/whatsapp/automations/${id}`, data);
    return response.data;
  },

  // Delete automation
  deleteAutomation: async (id) => {
    const response = await apiClient.delete(`/whatsapp/automations/${id}`);
    return response.data;
  },

  // Toggle automation on/off
  toggleAutomation: async (id, enabled) => {
    const response = await apiClient.put(`/whatsapp/automations/${id}/toggle`, { enabled });
    return response.data;
  },

  // ==================== ANALYTICS ====================

  // Get WhatsApp analytics
  getAnalytics: async (params = {}) => {
    const response = await apiClient.get('/whatsapp/analytics', { params });
    return response.data;
  },

  // ==================== LEGACY / QUICK ACTIONS ====================

  getMessageHistory: async (params = {}) => {
    const response = await apiClient.get('/whatsapp/messages', { params });
    return response.data;
  },

  sendQuotation: async (quotationId) => {
    const response = await apiClient.post('/whatsapp/send-quotation', { quotationId });
    return response.data;
  },

  sendOrderConfirmation: async (orderId) => {
    const response = await apiClient.post('/whatsapp/send-order-confirmation', { orderId });
    return response.data;
  },

  sendPaymentReminder: async (invoiceId) => {
    const response = await apiClient.post('/whatsapp/send-payment-reminder', { invoiceId });
    return response.data;
  },

  // Send catalogue to customer
  sendCatalogue: async (data) => {
    const response = await apiClient.post('/whatsapp/send-catalogue', data);
    return response.data;
  },

  // Send invoice via WhatsApp
  sendInvoice: async (invoiceId, phoneNumber) => {
    const response = await apiClient.post('/whatsapp/send-invoice', {
      invoiceId,
      phoneNumber,
    });
    return response.data;
  },

  // Send production update
  sendProductionUpdate: async (orderId, phoneNumber, stage) => {
    const response = await apiClient.post('/whatsapp/send-production-update', {
      orderId,
      phoneNumber,
      stage,
    });
    return response.data;
  },

  // Send dispatch notification
  sendDispatchNotification: async (dispatchId, phoneNumber) => {
    const response = await apiClient.post('/whatsapp/send-dispatch', {
      dispatchId,
      phoneNumber,
    });
    return response.data;
  },

  // Upload media file
  uploadMedia: async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post('/whatsapp/upload-media', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

import apiClient from './client';

export const proformasAPI = {
  // Get all proforma invoices
  getAllProformas: async (params = {}) => {
    const response = await apiClient.get('/proformas', { params });
    return response.data;
  },

  // Get single proforma
  getProformaById: async (id) => {
    const response = await apiClient.get(`/proformas/${id}`);
    return response.data;
  },

  // Create from quotation
  createFromQuotation: async (quotationId) => {
    const response = await apiClient.post('/proformas/from-quotation', { quotationId });
    return response.data;
  },

  // Create manually
  createProforma: async (data) => {
    const response = await apiClient.post('/proformas', data);
    return response.data;
  },

  // Update status
  updateProformaStatus: async (id, status) => {
    const response = await apiClient.patch(`/proformas/${id}/status`, { status });
    return response.data;
  },

  // Convert to order
  convertToOrder: async (id) => {
    const response = await apiClient.post(`/proformas/${id}/convert-to-order`);
    return response.data;
  },

  // Delete proforma
  deleteProforma: async (id) => {
    const response = await apiClient.delete(`/proformas/${id}`);
    return response.data;
  },

  // Get summary
  getProformaSummary: async () => {
    const response = await apiClient.get('/proformas/summary');
    return response.data;
  },
};

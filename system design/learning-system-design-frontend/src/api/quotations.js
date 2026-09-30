import apiClient from './client';

export const quotationsAPI = {
  getQuotations: async (params = {}) => {
    const response = await apiClient.get('/quotations', { params });
    return response.data;
  },

  getAllQuotations: async (params = {}) => {
    const response = await apiClient.get('/quotations', { params });
    // Handle pagination response
    if (response.data && response.data.quotations) {
      return response.data.quotations;
    }
    return response.data;
  },

  getQuotation: async (id) => {
    const response = await apiClient.get(`/quotations/${id}`);
    return response.data;
  },

  createQuotation: async (data) => {
    const response = await apiClient.post('/quotations', data);
    return response.data;
  },

  updateQuotation: async (id, data) => {
    const response = await apiClient.put(`/quotations/${id}`, data);
    return response.data;
  },

  deleteQuotation: async (id) => {
    const response = await apiClient.delete(`/quotations/${id}`);
    return response.data;
  },

  getQuotationStats: async () => {
    const response = await apiClient.get('/quotations/stats');
    return response.data;
  },
};

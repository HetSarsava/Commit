import apiClient from './client';

export const productionAPI = {
  getProductionBoard: async (params = {}) => {
    const response = await apiClient.get('/production/board', { params });
    return response.data;
  },

  getOrderProduction: async (orderId) => {
    const response = await apiClient.get(`/production/order/${orderId}`);
    return response.data;
  },

  createProductionTracking: async (data) => {
    const response = await apiClient.post('/production', data);
    return response.data;
  },

  updateProductionStage: async (id, data) => {
    const response = await apiClient.put(`/production/${id}`, data);
    return response.data;
  },

  bulkMoveToNextStage: async (trackingIds) => {
    const response = await apiClient.post('/production/bulk-move', { trackingIds });
    return response.data;
  },

  deleteProductionTracking: async (id) => {
    const response = await apiClient.delete(`/production/${id}`);
    return response.data;
  },
};

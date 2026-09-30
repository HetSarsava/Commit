import apiClient from './client';

export const dispatchAPI = {
  // Get all dispatches
  getAllDispatches: async (params = {}) => {
    const response = await apiClient.get('/dispatches', { params });
    return response.data;
  },

  // Get dispatch by ID
  getDispatchById: async (id) => {
    const response = await apiClient.get(`/dispatches/${id}`);
    return response.data;
  },

  // Get dispatches by customer
  getCustomerDispatches: async (customerId) => {
    const response = await apiClient.get(`/dispatches/customer/${customerId}`);
    return response.data;
  },

  // Get dispatch summary/metrics
  getDispatchSummary: async () => {
    const response = await apiClient.get('/dispatches/summary');
    return response.data;
  },

  // Get ready-to-dispatch production orders
  getReadyToDispatch: async () => {
    const response = await apiClient.get('/dispatches/ready');
    return response.data;
  },

  // Create dispatch
  createDispatch: async (data) => {
    const response = await apiClient.post('/dispatches', data);
    return response.data;
  },

  // Update dispatch status
  updateDispatchStatus: async (id, data) => {
    const response = await apiClient.patch(`/dispatches/${id}/status`, data);
    return response.data;
  },
};

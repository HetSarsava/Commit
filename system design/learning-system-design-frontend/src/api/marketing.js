import apiClient from './client';

export const marketingAPI = {
  // Get all campaigns
  getAllCampaigns: async (params = {}) => {
    const response = await apiClient.get('/marketing', { params });
    return response.data;
  },

  // Get campaign by ID
  getCampaignById: async (id) => {
    const response = await apiClient.get(`/marketing/${id}`);
    return response.data;
  },

  // Create campaign
  createCampaign: async (data) => {
    const response = await apiClient.post('/marketing', data);
    return response.data;
  },

  // Update campaign
  updateCampaign: async (id, data) => {
    const response = await apiClient.put(`/marketing/${id}`, data);
    return response.data;
  },

  // Delete campaign
  deleteCampaign: async (id) => {
    const response = await apiClient.delete(`/marketing/${id}`);
    return response.data;
  },

  // Get marketing dashboard
  getMarketingDashboard: async (params = {}) => {
    const response = await apiClient.get('/marketing/dashboard', { params });
    return response.data;
  },

  // Record campaign spend
  recordSpend: async (id, data) => {
    const response = await apiClient.post(`/marketing/${id}/spend`, data);
    return response.data;
  },
};

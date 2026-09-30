import apiClient from './client';

export const leadsAPI = {
  // Get all leads
  getLeads: async (params = {}) => {
    const response = await apiClient.get('/leads', { params });
    return response.data;
  },

  // Get single lead
  getLead: async (id) => {
    const response = await apiClient.get(`/leads/${id}`);
    return response.data;
  },

  // Create lead
  createLead: async (data) => {
    const response = await apiClient.post('/leads', data);
    return response.data;
  },

  // Update lead
  updateLead: async (id, data) => {
    const response = await apiClient.put(`/leads/${id}`, data);
    return response.data;
  },

  // Delete lead
  deleteLead: async (id) => {
    const response = await apiClient.delete(`/leads/${id}`);
    return response.data;
  },

  // Get lead stats
  getLeadStats: async () => {
    const response = await apiClient.get('/leads/stats');
    return response.data;
  },

  // Get pipeline funnel (11-stage conversion)
  getPipelineFunnel: async () => {
    const response = await apiClient.get('/leads/analytics/pipeline-funnel');
    return response.data;
  },

  // Get lead source performance
  getSourcePerformance: async () => {
    const response = await apiClient.get('/leads/analytics/source-performance');
    return response.data;
  },

  // Get salesperson performance
  getSalespersonPerformance: async () => {
    const response = await apiClient.get('/leads/analytics/salesperson-performance');
    return response.data;
  },
};

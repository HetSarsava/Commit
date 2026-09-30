import apiClient from './client';

export const reportsAPI = {
  getSalesReport: async (params = {}) => {
    const response = await apiClient.get('/reports/sales', { params });
    return response.data;
  },

  getProductReport: async (params = {}) => {
    const response = await apiClient.get('/reports/products', { params });
    return response.data;
  },

  getCustomerReport: async (params = {}) => {
    const response = await apiClient.get('/reports/customers', { params });
    return response.data;
  },

  getGSTReport: async (params = {}) => {
    const response = await apiClient.get('/reports/gst', { params });
    return response.data;
  },

  getPaymentReport: async (params = {}) => {
    const response = await apiClient.get('/reports/payments', { params });
    return response.data;
  },

  // ==================== EXPORT FUNCTIONS ====================

  exportSalesReport: async (format = 'excel', params = {}) => {
    const response = await apiClient.get('/reports/export/sales', {
      params: { ...params, format },
      responseType: 'blob',
    });
    return response.data;
  },

  exportLeadsReport: async (format = 'excel', params = {}) => {
    const response = await apiClient.get('/reports/export/leads', {
      params: { ...params, format },
      responseType: 'blob',
    });
    return response.data;
  },

  exportInventoryReport: async (format = 'excel', params = {}) => {
    const response = await apiClient.get('/reports/export/inventory', {
      params: { ...params, format },
      responseType: 'blob',
    });
    return response.data;
  },

  exportProductionReport: async (format = 'excel', params = {}) => {
    const response = await apiClient.get('/reports/export/production', {
      params: { ...params, format },
      responseType: 'blob',
    });
    return response.data;
  },

  exportMarketingReport: async (format = 'excel', params = {}) => {
    const response = await apiClient.get('/reports/export/marketing', {
      params: { ...params, format },
      responseType: 'blob',
    });
    return response.data;
  },
};

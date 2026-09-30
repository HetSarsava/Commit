import apiClient from './client';

export const invoicesAPI = {
  getInvoices: async (params = {}) => {
    const response = await apiClient.get('/invoices', { params });
    return response.data;
  },

  getInvoice: async (id) => {
    const response = await apiClient.get(`/invoices/${id}`);
    return response.data;
  },

  createInvoiceFromOrder: async (orderId) => {
    const response = await apiClient.post('/invoices/from-order', { orderId });
    return response.data;
  },

  updateInvoice: async (id, data) => {
    const response = await apiClient.put(`/invoices/${id}`, data);
    return response.data;
  },

  deleteInvoice: async (id) => {
    const response = await apiClient.delete(`/invoices/${id}`);
    return response.data;
  },
};

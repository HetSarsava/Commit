import apiClient from './client';

export const paymentsAPI = {
  getPayments: async (params = {}) => {
    const response = await apiClient.get('/payments', { params });
    return response.data;
  },

  getPayment: async (id) => {
    const response = await apiClient.get(`/payments/${id}`);
    return response.data;
  },

  getInvoicePayments: async (invoiceId) => {
    const response = await apiClient.get(`/payments/invoice/${invoiceId}`);
    return response.data;
  },

  recordPayment: async (data) => {
    const response = await apiClient.post('/manual/invoices/' + data.invoiceId + '/payment', data);
    return response.data;
  },

  updatePayment: async (id, data) => {
    const response = await apiClient.put(`/payments/${id}`, data);
    return response.data;
  },

  deletePayment: async (id) => {
    const response = await apiClient.delete(`/payments/${id}`);
    return response.data;
  },
};

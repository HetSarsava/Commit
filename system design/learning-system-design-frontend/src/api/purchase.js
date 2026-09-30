import apiClient from './client';

export const purchaseAPI = {
  // Suppliers
  getAllSuppliers: async () => {
    const response = await apiClient.get('/purchase/suppliers');
    return response.data;
  },

  createSupplier: async (data) => {
    const response = await apiClient.post('/purchase/suppliers', data);
    return response.data;
  },

  updateSupplier: async (id, data) => {
    const response = await apiClient.put(`/purchase/suppliers/${id}`, data);
    return response.data;
  },

  // Purchase Orders
  getAllPurchaseOrders: async (params = {}) => {
    const response = await apiClient.get('/purchase/purchase-orders', { params });
    return response.data;
  },

  getPurchaseOrderById: async (id) => {
    const response = await apiClient.get(`/purchase/purchase-orders/${id}`);
    return response.data;
  },

  createPurchaseOrder: async (data) => {
    const response = await apiClient.post('/purchase/purchase-orders', data);
    return response.data;
  },

  updatePOStatus: async (id, status) => {
    const response = await apiClient.patch(`/purchase/purchase-orders/${id}/status`, { status });
    return response.data;
  },

  recordMaterialReceived: async (id, data) => {
    const response = await apiClient.post(`/purchase/purchase-orders/${id}/receive`, data);
    return response.data;
  },

  // Summary
  getPurchaseSummary: async () => {
    const response = await apiClient.get('/purchase/summary');
    return response.data;
  },
};

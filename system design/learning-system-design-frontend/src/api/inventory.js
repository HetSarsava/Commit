import apiClient from './client';

export const inventoryAPI = {
  // Materials
  getAllMaterials: async (params = {}) => {
    const response = await apiClient.get('/inventory/materials', { params });
    return response.data;
  },

  getMaterialById: async (id) => {
    const response = await apiClient.get(`/inventory/materials/${id}`);
    return response.data;
  },

  createMaterial: async (data) => {
    const response = await apiClient.post('/inventory/materials', data);
    return response.data;
  },

  updateMaterial: async (id, data) => {
    const response = await apiClient.put(`/inventory/materials/${id}`, data);
    return response.data;
  },

  deleteMaterial: async (id) => {
    const response = await apiClient.delete(`/inventory/materials/${id}`);
    return response.data;
  },

  getLowStock: async () => {
    const response = await apiClient.get('/inventory/materials/low-stock');
    return response.data;
  },

  // Stock movements
  getStockMovements: async (params = {}) => {
    const response = await apiClient.get('/inventory/stock-movements', { params });
    return response.data;
  },

  recordStockMovement: async (data) => {
    const response = await apiClient.post('/inventory/stock-movements', data);
    return response.data;
  },

  // Summary
  getInventorySummary: async () => {
    const response = await apiClient.get('/inventory/summary');
    return response.data;
  },
};

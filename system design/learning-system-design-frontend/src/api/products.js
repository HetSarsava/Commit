import apiClient from './client';

export const productsAPI = {
  // Get all products (paginated response)
  getProducts: async (params = {}) => {
    const response = await apiClient.get('/products', { params });
    return response.data;
  },

  // Get all products (returns array only)
  getAllProducts: async (params = {}) => {
    const response = await apiClient.get('/products', { params });
    // Handle paginated response
    if (response.data && response.data.products) {
      return response.data.products;
    }
    return response.data;
  },

  // Get single product
  getProduct: async (id) => {
    const response = await apiClient.get(`/products/${id}`);
    return response.data;
  },

  // Create product
  createProduct: async (data) => {
    const response = await apiClient.post('/products', data);
    return response.data;
  },

  // Update product
  updateProduct: async (id, data) => {
    const response = await apiClient.put(`/products/${id}`, data);
    return response.data;
  },

  // Delete product
  deleteProduct: async (id) => {
    const response = await apiClient.delete(`/products/${id}`);
    return response.data;
  },

  // Get product stats
  getProductStats: async () => {
    const response = await apiClient.get('/products/stats');
    return response.data;
  },
};

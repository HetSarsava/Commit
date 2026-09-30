import apiClient from './client';

export const cataloguesAPI = {
  // Get all catalogues
  getAllCatalogues: async (params = {}) => {
    const response = await apiClient.get('/catalogues', { params });
    return response.data;
  },

  // Get single catalogue
  getCatalogueById: async (id) => {
    const response = await apiClient.get(`/catalogues/${id}`);
    return response.data;
  },

  // Get catalogue by share link (public)
  getCatalogueByLink: async (shareLink) => {
    const response = await apiClient.get(`/catalogues/share/${shareLink}`);
    return response.data;
  },

  // Create catalogue
  createCatalogue: async (data) => {
    const response = await apiClient.post('/catalogues', data);
    return response.data;
  },

  // Update catalogue status
  updateCatalogueStatus: async (id, status) => {
    const response = await apiClient.patch(`/catalogues/${id}/status`, { status });
    return response.data;
  },

  // Get catalogue analytics
  getCatalogueAnalytics: async (id) => {
    const response = await apiClient.get(`/catalogues/${id}/analytics`);
    return response.data;
  },

  // Track product click
  trackProductClick: async (catalogueId, productId) => {
    const response = await apiClient.post('/catalogues/track/click', {
      catalogueId,
      productId,
    });
    return response.data;
  },

  // Track enquiry click
  trackEnquiryClick: async (catalogueId) => {
    const response = await apiClient.post('/catalogues/track/enquiry', {
      catalogueId,
    });
    return response.data;
  },

  // Delete catalogue
  deleteCatalogue: async (id) => {
    const response = await apiClient.delete(`/catalogues/${id}`);
    return response.data;
  },

  // Get summary
  getCatalogueSummary: async () => {
    const response = await apiClient.get('/catalogues/summary');
    return response.data;
  },
};

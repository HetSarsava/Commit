import apiClient from './client';

export const settingsAPI = {
  // Get all settings
  getAllSettings: async () => {
    const response = await apiClient.get('/settings');
    return response.data;
  },

  // Get settings by category
  getSettingsByCategory: async (category) => {
    const response = await apiClient.get(`/settings/category/${category}`);
    return response.data;
  },

  // Get single setting by key
  getSettingByKey: async (key) => {
    const response = await apiClient.get(`/settings/${key}`);
    return response.data;
  },

  // Update settings (bulk update)
  updateSettings: async (settings) => {
    const response = await apiClient.put('/settings', { settings });
    return response.data;
  },

  // Update single setting
  updateSetting: async (key, value) => {
    const response = await apiClient.put(`/settings/${key}`, { value });
    return response.data;
  },

  // Reset settings to defaults
  resetSettings: async (category = null) => {
    const params = category ? { category } : {};
    const response = await apiClient.post('/settings/reset', null, { params });
    return response.data;
  },

  // Export settings for backup
  exportSettings: async () => {
    const response = await apiClient.get('/settings/export/backup', {
      responseType: 'blob',
    });
    return response.data;
  },

  // Import settings from backup
  importSettings: async (settings) => {
    const response = await apiClient.post('/settings/import', { settings });
    return response.data;
  },
};

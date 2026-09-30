import apiClient from './client';

export const authAPI = {
  // Register
  register: async (data) => {
    const response = await apiClient.post('/auth/register', data);
    return response.data;
  },

  // Login
  login: async (email, password) => {
    const response = await apiClient.post('/auth/login', { email, password });
    return response.data;
  },

  // Get current user
  getMe: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  // Update profile
  updateProfile: async (data) => {
    const response = await apiClient.put('/auth/profile', data);
    return response.data;
  },

  // Change password
  changePassword: async (currentPassword, newPassword) => {
    const response = await apiClient.put('/auth/change-password', {
      currentPassword,
      newPassword,
    });
    return response.data;
  },
};

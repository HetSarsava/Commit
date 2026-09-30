import apiClient from './client';

export const usersAPI = {
  // Get all users (Admin only)
  getAllUsers: async () => {
    const response = await apiClient.get('/users');
    return response.data;
  },

  // Get single user
  getUserById: async (id) => {
    const response = await apiClient.get(`/users/${id}`);
    return response.data;
  },

  // Create new user (Admin only)
  createUser: async (userData) => {
    const response = await apiClient.post('/users', userData);
    return response.data;
  },

  // Update user (Admin only)
  updateUser: async (id, userData) => {
    const response = await apiClient.put(`/users/${id}`, userData);
    return response.data;
  },

  // Delete user (Admin only)
  deleteUser: async (id) => {
    const response = await apiClient.delete(`/users/${id}`);
    return response.data;
  },

  // Update password
  updatePassword: async (id, passwordData) => {
    const response = await apiClient.put(`/users/${id}/password`, passwordData);
    return response.data;
  },

  // Get current user profile
  getProfile: async () => {
    const response = await apiClient.get('/users/profile');
    return response.data;
  },

  // Update current user profile
  updateProfile: async (profileData) => {
    const response = await apiClient.put('/users/profile', profileData);
    return response.data;
  },
};

import apiClient from './client';

export const activityLogsAPI = {
  // Get all activity logs with filters
  getAllLogs: async (params = {}) => {
    const response = await apiClient.get('/activity-logs', { params });
    return response.data;
  },

  // Get activity statistics
  getStats: async (params = {}) => {
    const response = await apiClient.get('/activity-logs/stats', { params });
    return response.data;
  },

  // Get logs for specific entity
  getEntityLogs: async (entityType, entityId) => {
    const response = await apiClient.get(`/activity-logs/entity/${entityType}/${entityId}`);
    return response.data;
  },

  // Get activity for specific user
  getUserActivity: async (userId, params = {}) => {
    const response = await apiClient.get(`/activity-logs/user/${userId}`, { params });
    return response.data;
  },

  // Delete old logs (Admin only)
  deleteOldLogs: async (days) => {
    const response = await apiClient.delete('/activity-logs/cleanup', {
      params: { days },
    });
    return response.data;
  },
};

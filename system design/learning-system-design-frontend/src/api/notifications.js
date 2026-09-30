import apiClient from './client';

export const notificationsAPI = {
  // Get my notifications
  getMyNotifications: async (params = {}) => {
    const response = await apiClient.get('/notifications', { params });
    return response.data;
  },

  // Get unread count
  getUnreadCount: async () => {
    const response = await apiClient.get('/notifications/unread-count');
    return response.data;
  },

  // Mark notification as read
  markAsRead: async (id) => {
    const response = await apiClient.put(`/notifications/${id}/read`);
    return response.data;
  },

  // Mark all as read
  markAllAsRead: async () => {
    const response = await apiClient.put('/notifications/mark-all-read');
    return response.data;
  },

  // Delete notification
  deleteNotification: async (id) => {
    const response = await apiClient.delete(`/notifications/${id}`);
    return response.data;
  },

  // Clear all read notifications
  clearRead: async () => {
    const response = await apiClient.delete('/notifications/clear-read/all');
    return response.data;
  },
};

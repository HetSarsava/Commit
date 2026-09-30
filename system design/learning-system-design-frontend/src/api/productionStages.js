import apiClient from './client';

export const productionStagesAPI = {
  // Get stages for a production order
  getProductionStages: async (orderId) => {
    const response = await apiClient.get(`/production-stages/${orderId}/stages`);
    return response.data;
  },

  // Get production timeline
  getProductionTimeline: async (productionId) => {
    const response = await apiClient.get(`/production-stages/${productionId}/timeline`);
    return response.data;
  },

  // Initialize stages
  initializeStages: async (data) => {
    const response = await apiClient.post('/production-stages/initialize', data);
    return response.data;
  },

  // Update stage progress
  updateStageProgress: async (stageId, data) => {
    const response = await apiClient.patch(`/production-stages/stages/${stageId}/progress`, data);
    return response.data;
  },

  // Start a stage
  startStage: async (stageId, data = {}) => {
    const response = await apiClient.patch(`/production-stages/stages/${stageId}/start`, data);
    return response.data;
  },

  // Complete a stage
  completeStage: async (stageId, data = {}) => {
    const response = await apiClient.patch(`/production-stages/stages/${stageId}/complete`, data);
    return response.data;
  },

  // Record material consumption
  recordMaterialConsumption: async (data) => {
    const response = await apiClient.post('/production-stages/material-consumption', data);
    return response.data;
  },
};

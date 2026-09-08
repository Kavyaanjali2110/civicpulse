import { apiClient } from './api';

export const predictiveService = {
  // Asset Health & Risk Intelligence
  getAssetsHealth: async (params = {}) => {
    const response = await apiClient.get('/analytics/assets/health', { params });
    return response.data;
  },

  getAssetsRisk: async (params = {}) => {
    const response = await apiClient.get('/analytics/assets/risk', { params });
    return response.data;
  },

  getAssetHealthDetail: async (id) => {
    const response = await apiClient.get(`/analytics/assets/${id}/health`);
    return response.data;
  },

  getAssetPredictions: async (id) => {
    const response = await apiClient.get(`/analytics/assets/${id}/predictions`);
    return response.data;
  },

  getWardRisks: async () => {
    const response = await apiClient.get('/analytics/wards/risk');
    return response.data;
  },

  getPredictiveRecommendations: async () => {
    const response = await apiClient.get('/analytics/predictive-maintenance');
    return response.data;
  },

  // Preventive Maintenance Orders
  createPreventiveOrder: async (data) => {
    const response = await apiClient.post('/dispatch/preventive-maintenance', data);
    return response.data;
  },

  getPreventiveOrders: async (params = {}) => {
    const response = await apiClient.get('/dispatch/preventive-maintenance', { params });
    return response.data;
  },

  getPreventiveOrderDetail: async (id) => {
    const response = await apiClient.get(`/dispatch/preventive-maintenance/${id}`);
    return response.data;
  },

  updatePreventiveOrderStatus: async (id, statusData) => {
    const response = await apiClient.put(`/dispatch/preventive-maintenance/${id}/status`, statusData);
    return response.data;
  },

  getCrewPreventiveOrders: async (crewId, params = {}) => {
    const response = await apiClient.get(`/dispatch/crews/${crewId}/preventive-orders`, { params });
    return response.data;
  },
};

export default predictiveService;

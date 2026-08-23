import { apiClient } from './api';

export const citizenService = {
  listComplaints: async (params = {}) => {
    const response = await apiClient.get('/gov/complaints', { params });
    return response.data;
  },

  getCategories: async () => {
    const response = await apiClient.get('/citizen/categories');
    return response.data;
  },

  submitComplaint: async (payload) => {
    const response = await apiClient.post('/citizen/complaints', payload);
    return response.data;
  },

  trackComplaint: async (trackingId) => {
    const response = await apiClient.get(`/citizen/complaints/${encodeURIComponent(trackingId.trim().toUpperCase())}`);
    return response.data;
  },

  transcribeVoice: async (rawText) => {
    const response = await apiClient.post(`/citizen/voice-transcribe?raw_text=${encodeURIComponent(rawText)}`);
    return response.data;
  },

  submitFeedback: async (trackingId, payload) => {
    const response = await apiClient.post(
      `/citizen/complaints/${encodeURIComponent(trackingId.trim().toUpperCase())}/feedback`,
      payload
    );
    return response.data;
  },

  getFeedback: async (trackingId) => {
    const response = await apiClient.get(
      `/citizen/complaints/${encodeURIComponent(trackingId.trim().toUpperCase())}/feedback`
    );
    return response.data;
  },
};

export default citizenService;

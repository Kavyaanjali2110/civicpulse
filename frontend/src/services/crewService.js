import { apiClient } from './api';

export const crewService = {
  getAssignedComplaints: async (crewId, params = {}) => {
    const response = await apiClient.get(`/gov/crews/${crewId}/assigned-complaints`, { params });
    return response.data;
  },

  getCrewInfo: async (crewId) => {
    const response = await apiClient.get(`/gov/crews/${crewId}`);
    return response.data;
  },

  acceptAssignment: async (assignmentId, payload = {}) => {
    const response = await apiClient.post(`/gov/assignments/${assignmentId}/accept`, payload);
    return response.data;
  },

  startWork: async (assignmentId, payload = {}) => {
    const response = await apiClient.post(`/gov/assignments/${assignmentId}/start`, payload);
    return response.data;
  },

  uploadResolutionEvidence: async (complaintId, payload) => {
    const response = await apiClient.post(`/gov/complaints/${complaintId}/resolution-evidence`, payload);
    return response.data;
  },

  completeAssignment: async (assignmentId, payload = {}) => {
    const response = await apiClient.post(`/gov/assignments/${assignmentId}/complete`, payload);
    return response.data;
  },
};

export default crewService;

import { apiClient } from './api';

export const govService = {
  getOverviewStats: async () => {
    const response = await apiClient.get('/gov/stats/overview');
    return response.data;
  },

  getWorkflowStats: async (params = {}) => {
    const response = await apiClient.get('/gov/stats/workflow', { params });
    return response.data;
  },

  listComplaints: async (params = {}) => {
    const response = await apiClient.get('/gov/complaints', { params });
    return response.data;
  },

  getComplaintDetail: async (id) => {
    const response = await apiClient.get(`/gov/complaints/${id}`);
    return response.data;
  },

  updateComplaintStatus: async (id, statusData) => {
    const response = await apiClient.patch(`/gov/complaints/${id}/status`, statusData);
    return response.data;
  },

  // Departments & Field Crews
  getDepartments: async (params = {}) => {
    const response = await apiClient.get('/gov/departments', { params });
    return response.data;
  },

  createDepartment: async (data) => {
    const response = await apiClient.post('/gov/departments', data);
    return response.data;
  },

  getCrews: async (params = {}) => {
    const response = await apiClient.get('/gov/crews', { params });
    return response.data;
  },

  createCrew: async (data) => {
    const response = await apiClient.post('/gov/crews', data);
    return response.data;
  },

  getCrew: async (id) => {
    const response = await apiClient.get(`/gov/crews/${id}`);
    return response.data;
  },

  updateCrew: async (id, data) => {
    const response = await apiClient.put(`/gov/crews/${id}`, data);
    return response.data;
  },

  getCrewAssignedComplaints: async (crewId, params = {}) => {
    const response = await apiClient.get(`/gov/crews/${crewId}/assigned-complaints`, { params });
    return response.data;
  },

  // Crew Dispatch & Assignments
  assignCrew: async (complaintId, payload) => {
    const response = await apiClient.post(`/gov/complaints/${complaintId}/assign`, payload);
    return response.data;
  },

  getComplaintAssignment: async (complaintId) => {
    const response = await apiClient.get(`/gov/complaints/${complaintId}/assignment`);
    return response.data;
  },

  acceptAssignment: async (assignmentId, payload = {}) => {
    const response = await apiClient.post(`/gov/assignments/${assignmentId}/accept`, payload);
    return response.data;
  },

  startAssignment: async (assignmentId, payload = {}) => {
    const response = await apiClient.post(`/gov/assignments/${assignmentId}/start`, payload);
    return response.data;
  },

  completeAssignment: async (assignmentId, payload = {}) => {
    const response = await apiClient.post(`/gov/assignments/${assignmentId}/complete`, payload);
    return response.data;
  },

  // Resolution Evidence & Feedback
  uploadResolutionEvidence: async (complaintId, payload) => {
    const response = await apiClient.post(`/gov/complaints/${complaintId}/resolution-evidence`, payload);
    return response.data;
  },

  getResolutionEvidence: async (complaintId) => {
    const response = await apiClient.get(`/gov/complaints/${complaintId}/resolution-evidence`);
    return response.data;
  },

  getComplaintFeedback: async (complaintId) => {
    const response = await apiClient.get(`/gov/complaints/${complaintId}/feedback`);
    return response.data;
  },

  getHeatmapPoints: async (params = {}) => {
    const response = await apiClient.get('/gov/heatmap/points', { params });
    return response.data;
  },

  getHotspots: async (params = {}) => {
    const response = await apiClient.get('/gov/hotspots', { params });
    return response.data;
  },

  triggerRecluster: async (params = {}) => {
    const response = await apiClient.post('/gov/hotspots/recluster', null, { params });
    return response.data;
  },

  getPriorityRankings: async (limit = 15) => {
    const response = await apiClient.get('/gov/priority-ranking', { params: { limit } });
    return response.data;
  },

  getTrends: async () => {
    const response = await apiClient.get('/gov/trends');
    return response.data;
  },

  getAIRecommendations: async () => {
    const response = await apiClient.get('/gov/ai-recommendations');
    return response.data;
  },

  getInfrastructureAssets: async () => {
    const response = await apiClient.get('/gov/infrastructure-assets');
    return response.data;
  },
};

export default govService;
